from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from langchain_core.documents import Document
import time
import tempfile
import os
from typing import List

from connection_supabase_client import (
    get_authenticated_supabase_client,
    get_service_role_client,
)

from .services import DocumentService, QAService, TTSService, LLMService
from .utils import (
    parse_pdf_bytes_to_docs, chunk_docs, detect_small_talk, transcribe_audio,
    conversation_state, format_chat_history, make_response_natural, 
    generate_host_opening, extract_last_question
)
from .prompts import ENHANCED_HOST_PROMPT, ENHANCED_GUEST_PROMPT
from .config import DEFAULT_AI_PERSONA, PERSONA_TO_VOICE

router = APIRouter()

# Initialize services
document_service = DocumentService()
qa_service = QAService()
tts_service = TTSService()
llm_service = LLMService()

# ========= KNOWLEDGE BASE ROUTES =========
@router.get("/knowledge-base/")
async def get_knowledge_base_files(auth_data: dict = Depends(get_authenticated_supabase_client)):
    """List the user's knowledge-base files."""
    supabase_authenticated = auth_data["client"]
    user_id = auth_data["user_id"]
    
    try:
        response = (
            supabase_authenticated.table("knowledge_base")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return JSONResponse(content=response.data)
    except Exception as e:
        print(f"knowledge-base error: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

@router.post("/upload-knowledge-base/")
async def upload_knowledge_base(
    file: UploadFile = File(...), 
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Upload a PDF/TXT, create embeddings & chunks, and store metadata."""
    supabase_authenticated = auth_data["client"]
    user_id = auth_data["user_id"]

    # Validate file type
    allowed = {"application/pdf": ".pdf", "text/plain": ".txt"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are allowed.")

    file_data = await file.read()
    if not file_data:
        raise HTTPException(status_code=400, detail="File is empty.")

    # Generate storage name
    timestamp = int(time.time())
    clean_filename = file.filename.replace(" ", "_")
    storage_name = f"{timestamp}_{clean_filename}"

    print(f"[upload] Processing {file.filename} as {storage_name} (size: {len(file_data)} bytes)")

    # Store file in Supabase storage
    try:
        supabase_authenticated.storage.from_("knowledge-base").upload(
            storage_name, file_data, {"content-type": file.content_type}
        )
        public_url = supabase_authenticated.storage.from_("knowledge-base").get_public_url(storage_name)
    except Exception as e:
        print(f"[upload] Storage upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    # Store metadata
    try:
        supabase_authenticated.table("knowledge_base").insert({
            "user_id": user_id,
            "file_name": file.filename,
            "public_url": public_url,
            "storage_path": storage_name,
        }).execute()
    except Exception as e:
        print(f"[upload] Metadata save failed: {e}")
        try:
            supabase_authenticated.storage.from_("knowledge-base").remove([storage_name])
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Metadata save failed: {str(e)}")

    # Process document into chunks (skip if already exist)
    service_client = get_service_role_client()
    if document_service.check_chunks_exist(service_client, user_id, storage_name):
        print(f"[upload] Chunks already exist for {storage_name}")
        return {
            "message": "Document uploaded successfully. Chunks already exist in database.",
            "public_url": public_url,
            "chunks_created": False,
        }

    # Create document chunks
    chunks_created = await _process_document_chunks(file_data, file.filename, storage_name, user_id, service_client)

    return {
        "message": "Document uploaded successfully.", 
        "public_url": public_url, 
        "chunks_created": chunks_created
    }

@router.post("/process-existing-document/")
async def process_existing_document(
    storage_path: str = Form(...), 
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Re-process an existing stored file to create missing chunks."""
    supabase_authenticated = auth_data["client"]
    user_id = auth_data["user_id"]
    service_client = get_service_role_client()

    # Get document info
    try:
        kb_result = (
            supabase_authenticated.table("knowledge_base")
            .select("*")
            .eq("user_id", user_id)
            .eq("storage_path", storage_path)
            .execute()
        )
        if not kb_result.data:
            raise HTTPException(status_code=404, detail="Document not found or access denied.")
        document_info = kb_result.data[0]
    except Exception as e:
        print(f"Error fetching document info: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch document information.")

    # Check if chunks already exist
    if document_service.check_chunks_exist(service_client, user_id, storage_path):
        return {
            "message": "Chunks already exist for this document.", 
            "chunks_created": False, 
            "storage_path": storage_path
        }

    # Download and process file
    try:
        file_data = supabase_authenticated.storage.from_("knowledge-base").download(storage_path)
        filename = document_info["file_name"]
        
        chunks_created = await _process_document_chunks(file_data, filename, storage_path, user_id, service_client)

        return {
            "message": f"Successfully processed existing document.",
            "chunks_created": chunks_created,
            "storage_path": storage_path,
        }
        
    except Exception as e:
        print(f"Error processing existing document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

# ========= QUERY ROUTES =========
@router.post("/query_audio/")
async def query_audio(
    audio: UploadFile = File(...), 
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Process audio and return transcribed text."""
    temp_path = f"temp_{audio.filename}"

    try:
        # Save uploaded audio
        with open(temp_path, "wb") as f:
            f.write(await audio.read())

        if os.path.getsize(temp_path) == 0:
            return JSONResponse(
                content={"error": "Uploaded audio file is empty"}, 
                status_code=400
            )

        # Transcribe audio
        query_text = transcribe_audio(temp_path)
        
        if "[No speech detected]" in query_text or "[Error processing audio]" in query_text:
            return JSONResponse(
                content={"error": "Could not understand audio", "query": query_text}, 
                status_code=400
            )

        return JSONResponse(content={"query": query_text, "success": True})

    except Exception as e:
        return JSONResponse(
            content={"error": str(e), "query": "[Error processing audio]"}, 
            status_code=500
        )
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass

@router.post("/respond/")
async def generate_response(
    query: str = Form(...), 
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Generate AI response for the given query - returns both text and audio; grounded to user's docs."""
    try:
        supabase_authenticated = auth_data["client"]
        user_id = auth_data["user_id"]
        q = (query or "").strip()

        # Handle small talk
        smalltalk = detect_small_talk(q)
        if smalltalk:
            return {
                "answer_text": smalltalk,
                "sources": [],
                "audio_data": tts_service.generate_audio(smalltalk),
                "audio_type": "audio/wav",
            }

        # Check if user has documents
        try:
            docs_resp = (
                supabase_authenticated.table("documents")
                .select("id")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            if not docs_resp.data:
                msg = "I don't have any documents for you yet. Please upload a file first."
                return {
                    "answer_text": msg,
                    "sources": [],
                    "audio_data": tts_service.generate_audio(msg),
                    "audio_type": "audio/wav",
                }
        except Exception as e:
            print(f"[respond] Error checking documents: {e}")

        # Get relevant context and generate answer
        context_text, sources = document_service.get_relevant_context(supabase_authenticated, user_id, q)
        
        if not context_text:
            answer = "I don't know based on the provided documents."
            return {
                "answer_text": answer,
                "sources": [],
                "audio_data": tts_service.generate_audio(answer),
                "audio_type": "audio/wav",
            }

        # Create documents from context
        context_docs = [Document(page_content=context_text, metadata={})]
        result = qa_service.generate_answer(context_docs, q)

        return {
            "answer_text": result["answer"],
            "sources": result["sources"],
            "audio_data": tts_service.generate_audio(result["answer"]),
            "audio_type": "audio/wav",
        }

    except Exception as e:
        print(f"[respond] Error: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

# ========= PODCAST ROUTES =========
@router.post("/podcast/start/")
async def start_podcast_conversation(
    show_name: str = Form("AI Knowledge Podcast"),
    guest_name: str = Form("Expert Guest"),
    conversation_id: str = Form("default"),
    auth_data: dict = Depends(get_authenticated_supabase_client),
):
    """Start a new podcast conversation with host opening"""
    try:
        supabase_authenticated = auth_data["client"]
        user_id = auth_data["user_id"]
        key = (user_id, conversation_id)
        
        # Clear previous conversation
        conversation_state[key].clear()
        
        # Get context for opening
        context_text, sources = document_service.get_relevant_context(
            supabase_authenticated, user_id, "overview introduction summary"
        )
        
        # Generate host opening
        opening = generate_host_opening(context_text, show_name, guest_name)
        conversation_state[key].append({"role": "ai-host", "text": opening})
        
        # Generate TTS
        audio_b64 = tts_service.generate_audio(opening, voice="m-us-1", steps=5)
        
        return {
            "answer_text": opening,
            "follow_up": extract_last_question(opening),
            "sources": sources,
            "audio_data": audio_b64,
            "audio_type": "audio/wav",
            "conversation_started": True
        }
    
    except Exception as e:
        print(f"Start podcast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/podcast/turn/")
async def enhanced_podcast_turn(
    message: str = Form(...),
    persona: str = Form(DEFAULT_AI_PERSONA),
    show_name: str = Form("AI Knowledge Podcast"),
    conversation_id: str = Form("default"),
    guest_name: str = Form("Expert Guest"),
    auto_duet: bool = Form(False),
    is_conversation_start: bool = Form(False),
    auth_data: dict = Depends(get_authenticated_supabase_client),
):
    """Enhanced podcast conversation with natural flow and proper host/guest dynamics"""
    try:
        supabase_authenticated = auth_data["client"]
        user_id = auth_data["user_id"]
        key = (user_id, conversation_id)
        
        # Check if user has documents
        try:
            docs_check = (
                supabase_authenticated.table("documents")
                .select("id")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            if not docs_check.data:
                no_docs_msg = "I'd love to chat, but I don't have any documents to discuss yet. Please upload some content first!"
                return {
                    "answer_text": no_docs_msg,
                    "sources": [],
                    "audio_data": tts_service.generate_audio(no_docs_msg),
                    "audio_type": "audio/wav"
                }
        except Exception as e:
            print(f"Document check error: {e}")
        
        # Handle conversation start with host opening
        if is_conversation_start and persona == "host":
            context_text, sources = document_service.get_relevant_context(
                supabase_authenticated, user_id, "introduction overview summary", max_docs=3
            )
            
            opening = generate_host_opening(context_text, show_name, guest_name)
            conversation_state[key].append({"role": "ai-host", "text": opening})
            
            # Generate TTS with host voice
            audio_b64 = tts_service.generate_audio(opening, voice="m-us-1", steps=5)
            
            return {
                "answer_text": opening,
                "follow_up": extract_last_question(opening),
                "sources": sources,
                "audio_data": audio_b64,
                "audio_type": "audio/wav"
            }
        
        # Add user message to conversation memory
        if message and message.strip():
            conversation_state[key].append({"role": "user", "text": message})
        
        # Get relevant context
        context_text, sources = document_service.get_relevant_context(
            supabase_authenticated, user_id, message
        )
        
        # Build conversation history
        chat_history = format_chat_history(list(conversation_state[key]))
        
        # Choose prompt and generate response
        if persona == "host":
            prompt_template = ENHANCED_HOST_PROMPT
            llm = llm_service.make_enhanced_llm(temperature=0.8, max_tokens=500)
            voice = "m-us-1"  # Male host voice
        else:  # guest
            prompt_template = ENHANCED_GUEST_PROMPT
            llm = llm_service.make_enhanced_llm(temperature=0.7, max_tokens=450)
            voice = "f-us-1"  # Female guest voice
        
        # Generate response
        filled_prompt = prompt_template.format(
            context=context_text,
            question=message,
            chat_history=chat_history,
            show_name=show_name,
            guest_name=guest_name
        )
        
        result = llm.invoke(filled_prompt)
        raw_answer = getattr(result, "content", str(result))
        
        # Process and clean the response
        answer = make_response_natural(raw_answer, persona)
        
        # Add AI response to conversation memory
        role = "ai-host" if persona == "host" else "ai-guest"
        conversation_state[key].append({"role": role, "text": answer})
        
        # Generate high-quality TTS
        audio_b64 = tts_service.generate_audio(answer, voice=voice, steps=5)
        
        response = {
            "answer_text": answer,
            "follow_up": extract_last_question(answer) if persona == "host" else None,
            "sources": sources,
            "audio_data": audio_b64,
            "audio_type": "audio/wav"
        }
        
        # Auto-duet: Guest responds to host
        if auto_duet and persona == "host":
            time.sleep(0.5)  # Natural delay
            
            guest_prompt_filled = ENHANCED_GUEST_PROMPT.format(
                context=context_text,
                question=answer,  # Host's question becomes guest's input
                chat_history=format_chat_history(list(conversation_state[key])),
                show_name=show_name,
                guest_name=guest_name
            )
            
            guest_llm = llm_service.make_enhanced_llm(temperature=0.7, max_tokens=400)
            guest_result = guest_llm.invoke(guest_prompt_filled)
            guest_raw = getattr(guest_result, "content", str(guest_result))
            guest_answer = make_response_natural(guest_raw, "guest")
            
            conversation_state[key].append({"role": "ai-guest", "text": guest_answer})
            guest_audio = tts_service.generate_audio(guest_answer, voice="f-us-1", steps=4)
            
            response["duet_guest"] = {
                "answer_text": guest_answer,
                "audio_data": guest_audio,
                "audio_type": "audio/wav"
            }
        
        return response
    
    except Exception as e:
        print(f"Enhanced podcast turn error: {e}")
        error_msg = "Sorry, I'm having trouble right now. Can we try that again?"
        return {
            "answer_text": error_msg,
            "sources": [],
            "audio_data": tts_service.generate_audio(error_msg),
            "audio_type": "audio/wav"
        }

# ========= HELPER FUNCTIONS =========
async def _process_document_chunks(file_data: bytes, filename: str, storage_name: str, user_id: str, service_client):
    """Process document into chunks and store in database"""
    chunks_created = False
    try:
        docs: List[Document] = []
        ext = os.path.splitext(filename)[1].lower()

        if ext == ".pdf":
            docs = parse_pdf_bytes_to_docs(file_data, filename)
        elif ext == ".txt":
            text = file_data.decode("utf-8", errors="replace")
            if text.strip():
                docs = [Document(page_content=text, metadata={"source": filename})]

        if docs:
            chunks = chunk_docs(docs)
            if chunks:
                # Add metadata to chunks
                for chunk in chunks:
                    chunk.metadata.update({
                        "title": filename, 
                        "file_path": storage_name, 
                        "user_id": user_id
                    })

                # Generate embeddings and store
                vectors = document_service.embeddings_service.embed_documents([c.page_content for c in chunks])

                rows = [
                    {
                        "content": c.page_content, 
                        "metadata": c.metadata, 
                        "embedding": vectors[i], 
                        "user_id": user_id
                    }
                    for i, c in enumerate(chunks)
                ]

                service_client.table("documents").insert(rows).execute()
                print(f"Successfully inserted {len(rows)} document chunks")
                chunks_created = True

    except Exception as e:
        print(f"Document processing failed: {e}")
    
    return chunks_created