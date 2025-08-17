# module_knowledgeBase_route.py
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.params import Depends
from fastapi.responses import JSONResponse
from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain.prompts import PromptTemplate
from langchain_core.documents import Document
from langchain.schema import BaseRetriever
from gtts import gTTS
import speech_recognition as sr
import os
import time
import tempfile
import requests
import re
import json
from typing import Dict, Optional, List
from connection_supabase_client import get_authenticated_supabase_client, get_service_role_client
from supabase import Client, create_client

router = APIRouter()

# ========= Config =========
os.environ["TOGETHER_API_KEY"] = os.environ.get(
    "TOGETHER_API_KEY", "f98103d1acc08e8528e75028deee01807c69312f742eaddbd877d1b87123dffb"
)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
EMBEDDING_DIM = 384

def make_llm(temperature=0.1, max_tokens=512):
    return ChatOpenAI(
        openai_api_base="https://api.together.xyz/v1",
        openai_api_key=os.environ.get("TOGETHER_API_KEY"),
        model_name="mistralai/Mistral-7B-Instruct-v0.1",
        temperature=temperature,
        max_tokens=max_tokens,
    )

SAFE_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""
You must answer strictly using only the Context. Do NOT invent facts.
If the answer cannot be found in the Context, reply exactly:
"I don't know based on the provided documents."

Tone:
- Conversational, friendly, concise (2–6 short sentences).
- No extra details beyond the Context.
- When you cite a specific fact, add a short source tag like [Resume-Rabeea-Chughtai.pdf].

Context:
{context}

Question:
{question}

Answer:
""",
)

CHUNK_SIZE = 500
CHUNK_OVERLAP = 100
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

SMALL_TALK_PATTERNS = {
    r"^\s*(hi|hello|hey)\b": "Hey there! How can I help with your documents today?",
    r"\b(thank(s)?|thank you|appreciate it)\b": "You're welcome! If you'd like, ask me something about your documents.",
    r"\b(bye|goodbye|see ya|see you)\b": "Bye! If you need anything from your documents later, just ask.",
}

# ========= Helpers =========
def parse_pdf_bytes_to_docs(file_bytes: bytes, filename: str) -> List[Document]:
    docs: List[Document] = []
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(tmp_path)
            for pnum, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    docs.append(Document(page_content=text, metadata={"source": filename, "page": pnum + 1}))
        except Exception:
            loader = PyPDFLoader(tmp_path)
            docs = loader.load()
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
    return docs

def chunk_docs(docs: List[Document]) -> List[Document]:
    splitter = CharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    return splitter.split_documents(docs)

def polish_answer(answer: str) -> str:
    if not answer:
        return "I don't know based on the provided documents."
    a = answer.strip()
    if a and not a[0].isupper():
        a = a[0].upper() + a[1:]
    if not a.endswith((".", "?", "!")):
        a += "."
    return a

def detect_small_talk(text: str) -> Optional[str]:
    q = text.lower().strip()
    for pattern, reply in SMALL_TALK_PATTERNS.items():
        if re.search(pattern, q):
            return reply
    return None

def check_document_chunks_exist(supabase_client, user_id: str, storage_path: str) -> bool:
    """Check if chunks for a document already exist in the documents table"""
    try:
        result = supabase_client.table("documents").select("id").eq("user_id", user_id).eq("metadata->>file_path", storage_path).limit(1).execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"Error checking existing chunks: {e}")
        return False

class StaticRetriever(BaseRetriever):
    def __init__(self, docs: List[Document]):
        super().__init__()
        self._docs = docs
    
    def _get_relevant_documents(self, query: str) -> List[Document]:
        return self._docs
    
    @property
    def docs(self):
        return self._docs

# ========= Endpoints =========
@router.get("/knowledge-base/")
async def get_knowledge_base_files(auth_data: dict = Depends(get_authenticated_supabase_client)):
    supabase_authenticated = auth_data["client"]
    user_id = auth_data["user_id"]
    try:
        response = supabase_authenticated.table("knowledge_base").select("*").eq("user_id", user_id).execute()
        return JSONResponse(content=response.data)
    except Exception as e:
        print(f"knowledge-base error: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

@router.post("/upload-knowledge-base/")
async def upload_knowledge_base(file: UploadFile = File(...), auth_data: dict = Depends(get_authenticated_supabase_client)):
    supabase_authenticated = auth_data["client"]
    user_id = auth_data["user_id"]

    # Validate file type
    allowed = {
        "application/pdf": ".pdf",
        "text/plain": ".txt",
    }
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are allowed.")

    # Read file
    file_data = await file.read()
    if not file_data:
        raise HTTPException(status_code=400, detail="File is empty.")
    
    timestamp = int(time.time())
    clean_filename = file.filename.replace(" ", "_")
    storage_name = f"{timestamp}_{clean_filename}"

    print(f"[upload] Processing {file.filename} as {storage_name} (size: {len(file_data)} bytes)")

    # Upload to storage (KEEP THIS - don't change the storage functionality)
    try:
        upload_result = supabase_authenticated.storage.from_("knowledge-base").upload(
            storage_name, file_data, {"content-type": file.content_type}
        )
        public_url = supabase_authenticated.storage.from_("knowledge-base").get_public_url(storage_name)
    except Exception as e:
        print(f"[upload] Storage upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    # Save metadata to knowledge_base table
    try:
        meta_result = supabase_authenticated.table("knowledge_base").insert({
            "user_id": user_id,
            "file_name": file.filename,
            "public_url": public_url,
            "storage_path": storage_name,
        }).execute()
    except Exception as e:
        print(f"[upload] Metadata save failed: {e}")
        try:
            supabase_authenticated.storage.from_("knowledge-base").remove([storage_name])
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Metadata save failed: {str(e)}")

    # Check if chunks already exist for this document
    service_client = get_service_role_client()
    chunks_exist = check_document_chunks_exist(service_client, user_id, storage_name)
    
    if chunks_exist:
        print(f"[upload] Chunks already exist for {storage_name}, skipping chunk creation")
        return {
            "message": "Document uploaded successfully. Chunks already exist in database.",
            "public_url": public_url,
            "chunks_created": False
        }

    # Process document content and create embeddings (only if chunks don't exist)
    try:
        docs: List[Document] = []
        ext = os.path.splitext(file.filename)[1].lower()
        
        if ext == ".pdf":
            docs = parse_pdf_bytes_to_docs(file_data, file.filename)
        elif ext == ".txt":
            text = file_data.decode("utf-8", errors="replace")
            if text.strip():
                docs = [Document(page_content=text, metadata={"source": file.filename})]

        if not docs:
            print("[upload] No content extracted from document")
            return {
                "message": "Document uploaded but no content could be extracted.",
                "public_url": public_url,
                "chunks_created": False
            }

        # Create chunks
        chunks = chunk_docs(docs)
        print(f"[upload] Created {len(chunks)} chunks")
        
        if not chunks:
            return {
                "message": "Document uploaded but no chunks created.",
                "public_url": public_url,
                "chunks_created": False
            }

        # Add metadata to chunks
        for chunk in chunks:
            chunk.metadata.update({
                "title": file.filename,
                "file_path": storage_name,
                "user_id": user_id
            })

        # Generate embeddings
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        texts = [chunk.page_content for chunk in chunks]
        vectors = embeddings.embed_documents(texts)
        
        # Prepare rows for insertion
        rows = []
        for i, chunk in enumerate(chunks):
            rows.append({
                "content": chunk.page_content,
                "metadata": chunk.metadata,
                "embedding": vectors[i],
                "user_id": user_id,
            })

        # Insert using service role client
        try:
            result = service_client.table("documents").insert(rows).execute()
            print(f"[upload] Successfully inserted {len(rows)} document chunks")
            chunks_created = True
        except Exception as e:
            print(f"[upload] Failed to insert into documents table: {e}")
            chunks_created = False
            
    except Exception as e:
        print(f"[upload] Document processing failed: {e}")
        chunks_created = False

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
    """Process an existing document from knowledge-base to create chunks if they don't exist"""
    supabase_authenticated = auth_data["client"]
    user_id = auth_data["user_id"]
    service_client = get_service_role_client()

    # Check if the document belongs to the user
    try:
        kb_result = supabase_authenticated.table("knowledge_base").select("*").eq("user_id", user_id).eq("storage_path", storage_path).execute()
        if not kb_result.data:
            raise HTTPException(status_code=404, detail="Document not found or access denied.")
        
        document_info = kb_result.data[0]
    except Exception as e:
        print(f"Error fetching document info: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch document information.")

    # Check if chunks already exist
    chunks_exist = check_document_chunks_exist(service_client, user_id, storage_path)
    
    if chunks_exist:
        return {
            "message": "Chunks already exist for this document.",
            "chunks_created": False,
            "storage_path": storage_path
        }

    # Download the file from storage
    try:
        file_response = supabase_authenticated.storage.from_("knowledge-base").download(storage_path)
        file_data = file_response
    except Exception as e:
        print(f"Error downloading file: {e}")
        raise HTTPException(status_code=500, detail="Failed to download file from storage.")

    # Process the document
    try:
        docs: List[Document] = []
        filename = document_info["file_name"]
        ext = os.path.splitext(filename)[1].lower()
        
        if ext == ".pdf":
            docs = parse_pdf_bytes_to_docs(file_data, filename)
        elif ext == ".txt":
            text = file_data.decode("utf-8", errors="replace")
            if text.strip():
                docs = [Document(page_content=text, metadata={"source": filename})]

        if not docs:
            return {
                "message": "No content could be extracted from document.",
                "chunks_created": False,
                "storage_path": storage_path
            }

        # Create chunks
        chunks = chunk_docs(docs)
        
        if not chunks:
            return {
                "message": "No chunks created from document.",
                "chunks_created": False,
                "storage_path": storage_path
            }

        # Add metadata to chunks
        for chunk in chunks:
            chunk.metadata.update({
                "title": filename,
                "file_path": storage_path,
                "user_id": user_id
            })

        # Generate embeddings
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        texts = [chunk.page_content for chunk in chunks]
        vectors = embeddings.embed_documents(texts)
        texts = [chunk.page_content for chunk in chunks]
        vectors = embeddings.embed_documents(texts)
        
        # Prepare rows for insertion
        rows = []
        for i, chunk in enumerate(chunks):
            rows.append({
                "content": chunk.page_content,
                "metadata": chunk.metadata,
                "embedding": vectors[i],
                "user_id": user_id,
            })

        # Insert chunks
        result = service_client.table("documents").insert(rows).execute()
        print(f"[process-existing] Successfully inserted {len(rows)} document chunks")
        
        return {
            "message": f"Successfully created {len(rows)} chunks for existing document.",
            "chunks_created": True,
            "storage_path": storage_path,
            "chunk_count": len(rows)
        }
        
    except Exception as e:
        print(f"Error processing existing document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@router.post("/query_audio/")
async def query_audio(audio: UploadFile = File(...), auth_data: dict = Depends(get_authenticated_supabase_client)):
    """Process audio and return transcribed text immediately"""
    recognizer = sr.Recognizer()
    temp_path = f"temp_{audio.filename}"
    
    try:
        with open(temp_path, "wb") as f:
            f.write(await audio.read())

        if os.path.getsize(temp_path) == 0:
            return JSONResponse(content={"error": "Uploaded audio file is empty"}, status_code=400)

        with sr.AudioFile(temp_path) as source:
            audio_data = recognizer.record(source)
            query_text = recognizer.recognize_google(audio_data)
            
        # Return transcribed text immediately
        return JSONResponse(content={"query": query_text, "success": True})
            
    except sr.UnknownValueError:
        return JSONResponse(content={"error": "Could not understand audio", "query": "[No speech detected]"}, status_code=400)
    except Exception as e:
        return JSONResponse(content={"error": str(e), "query": "[Error processing audio]"}, status_code=500)
    finally:
        try:
            os.remove(temp_path)
        except:
            pass

@router.post("/respond/")
async def generate_response(query: str = Form(...), auth_data: dict = Depends(get_authenticated_supabase_client)):
    """Generate AI response for the given query"""
    try:
        supabase_authenticated = auth_data["client"]
        user_id = auth_data["user_id"]
        q = (query or "").strip()

        # Handle small talk
        smalltalk = detect_small_talk(q)
        if smalltalk:
            tts = gTTS(smalltalk)
            audio_filename = f"response_{user_id}.mp3"
            tts.save(audio_filename)
            return {"answer_text": smalltalk, "sources": [], "audio_file_url": f"/audio/{audio_filename}"}

        # Check if user has documents
        try:
            docs_resp = supabase_authenticated.table("documents").select("id, content").eq("user_id", user_id).limit(3).execute()
            if not docs_resp.data:
                msg = "I don't have any documents for you yet. Please upload a file first."
                tts = gTTS(msg)
                audio_filename = f"response_{user_id}.mp3"
                tts.save(audio_filename)
                return {"answer_text": msg, "sources": [], "audio_file_url": f"/audio/{audio_filename}"}
        except Exception as e:
            print(f"[respond] Error checking documents: {e}")

        # Generate query embedding and search
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        query_vector = embeddings.embed_query(q)

        # Search for similar documents
        candidate_rows = []
        try:
            # Try the RPC function first
            rpc_result = supabase_authenticated.rpc("match_documents_v2", {
                "query_embedding": query_vector,
                "match_count": 5,
                "metadata_filter": {"user_id": user_id}
            }).execute()
            
            if rpc_result.data:
                candidate_rows = rpc_result.data
                print(f"[respond] Found {len(candidate_rows)} candidate documents via RPC")
        except Exception as e:
            print(f"[respond] RPC search failed: {e}")
            
        # If RPC failed or returned no results, use fallback search
        if not candidate_rows:
            try:
                # Fallback: simple similarity search using cosine distance
                fallback = supabase_authenticated.table("documents").select(
                    "content, metadata, embedding"
                ).eq("user_id", user_id).limit(20).execute()
                
                if fallback.data:
                    # Calculate similarity manually and sort
                    import numpy as np
                    
                    query_np = np.array(query_vector)
                    similarities = []
                    
                    for row in fallback.data:
                        doc_embedding = np.array(row['embedding'])
                        # Cosine similarity
                        similarity = np.dot(query_np, doc_embedding) / (np.linalg.norm(query_np) * np.linalg.norm(doc_embedding))
                        similarities.append((similarity, row))
                    
                    # Sort by similarity (highest first) and take top 5
                    similarities.sort(key=lambda x: x[0], reverse=True)
                    candidate_rows = [row for _, row in similarities[:5]]
                    print(f"[respond] Found {len(candidate_rows)} candidate documents via fallback")
                    
            except Exception as fe:
                print(f"[respond] Fallback search failed: {fe}")
                # Last resort: just get any documents for this user
                try:
                    simple_fallback = supabase_authenticated.table("documents").select("content, metadata").eq("user_id", user_id).limit(5).execute()
                    candidate_rows = simple_fallback.data or []
                    print(f"[respond] Using simple fallback: {len(candidate_rows)} documents")
                except Exception as sfe:
                    print(f"[respond] Simple fallback failed: {sfe}")

        if not candidate_rows:
            answer = "I don't know based on the provided documents."
            tts = gTTS(answer)
            audio_filename = f"response_{user_id}.mp3"
            tts.save(audio_filename)
            return {"answer_text": answer, "sources": [], "audio_file_url": f"/audio/{audio_filename}"}

        # Convert to documents
        retrieved_documents = []
        for row in candidate_rows:
            content = row.get("content", "")
            metadata = row.get("metadata", {})
            retrieved_documents.append(Document(page_content=content, metadata=metadata))

        # Generate answer
        llm = make_llm(temperature=0.1, max_tokens=512)
        qa = RetrievalQA.from_chain_type(
            llm=llm,
            retriever=StaticRetriever(retrieved_documents),
            chain_type="stuff",
            chain_type_kwargs={"prompt": SAFE_PROMPT},
            return_source_documents=True,
        )

        result = qa.invoke({"query": q})
        answer = polish_answer(result.get("result", ""))
        
        # Prepare sources
        sources = []
        for doc in result.get("source_documents", []):
            sources.append({
                "title": doc.metadata.get("title"),
                "file_path": doc.metadata.get("file_path"),
                "page": doc.metadata.get("page"),
                "snippet": doc.page_content[:300]
            })

        # Generate audio
        audio_filename = f"response_{user_id}.mp3"
        tts = gTTS(answer)
        tts.save(audio_filename)

        return {"answer_text": answer, "sources": sources, "audio_file_url": f"/audio/{audio_filename}"}

    except Exception as e:
        print(f"[respond] Error: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)