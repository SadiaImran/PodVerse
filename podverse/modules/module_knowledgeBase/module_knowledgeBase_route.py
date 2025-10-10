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
import speech_recognition as sr
import os
import time
import tempfile
import re
from typing import Dict, Optional, List
from dotenv import load_dotenv
from gradio_client import Client

from connection_supabase_client import (
    get_authenticated_supabase_client,
    get_service_role_client,
)

router = APIRouter()

# ========= CONFIGURATION =========
load_dotenv()

os.environ["TOGETHER_API_KEY"] = os.environ.get(
    "TOGETHER_API_KEY", "f98103d1acc08e8528e75028deee01807c69312f742eaddbd877d1b87123dffb"
)
HF_TOKEN_1075 = os.environ.get("HF_TOKEN_1075")
LLM_URL = os.environ.get("LLM_URL")

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

# Small talk patterns
SMALL_TALK_PATTERNS: Dict[str, str] = {
    r"^\s*(hi|hello|hey)(?:\s+how\s+are\s+you)?\b": "Hi there! Thanks for having me on the show, I'm doing fantastic! How about you?",
    r"\b(thank(s)?|thank you|appreciate it)\b": "You're so welcome! I'm thrilled to be here and excited about our chat!",
    r"\b(bye|goodbye|see ya|see you)\b": "Thank you for having me! This was absolutely wonderful, take care!",
}

from gradio_client import Client

client = Client(
    "sadiaimran1075/deepseek-ai-DeepSeek-V3.2-Exp",
    hf_token=HF_TOKEN_1075
)

@router.get("/test-llm/")
def call_llm(query: str):
    print(f"🎉 Test LLM endpoint called with query: {query}")
    try:
        result = client.predict(
            message=query,
            api_name="/chat"
        )
        print(f"✅ LLM Response: {result}")
        return {
            "message": "LLM test successful!",
            "query": query,
            "response": result,
            "status": "success"
        }
    except Exception as e:
        print(f"❌ LLM Error: {e}")
        return {
            "message": "LLM test failed!",
            "query": query,
            "error": str(e),
            "status": "error"
        }

# ========= LLM SETUP =========
def make_llm_hf(query: str, temperature=0.1, max_tokens=512):
    """Use Hugging Face LLM for document Q&A"""
    try:
        result = client.predict(
            message=query,
            api_name="/chat"
        )
        return result
    except Exception as e:
        print(f"❌ Hugging Face LLM Error: {e}")
        return "I'm sorry, I couldn't process your request right now."

# Standard Q&A prompt
SAFE_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""
You must answer strictly using only the Context. Do NOT invent facts.
If the answer cannot be found in the Context, reply exactly:
"I don't know based on the provided documents."

Tone:
- Conversational, friendly, concise (2–6 short sentences).
- No extra details beyond the Context.
- When you cite a specific fact, add a short source tag like [filename.pdf].

Context:
{context}

Question:
{question}

Answer:
""",
)

# ========= UTILITY FUNCTIONS =========
def parse_pdf_bytes_to_docs(file_bytes: bytes, filename: str) -> List[Document]:
    """Extract text from PDF bytes into LangChain Documents."""
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
                    docs.append(Document(
                        page_content=text,
                        metadata={"source": filename, "page": pnum + 1},
                    ))
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
    """Split documents into chunks"""
    splitter = CharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    return splitter.split_documents(docs)

def polish_answer(answer: str) -> str:
    """Clean up and format the answer"""
    if not answer:
        return "I don't know based on the provided documents."
    
    a = answer.strip()
    if a and not a[0].isupper():
        a = a[0].upper() + a[1:]
    if not a.endswith((".", "?", "!")):
        a += "."
    return a

def detect_small_talk(text: str) -> Optional[str]:
    """Detect and respond to small talk"""
    q = text.lower().strip()
    for pattern, reply in SMALL_TALK_PATTERNS.items():
        if re.search(pattern, q):
            return reply
    return None

def check_document_chunks_exist(supabase_client, user_id: str, storage_path: str) -> bool:
    """Check if chunks for a document already exist in the documents table."""
    try:
        result = (
            supabase_client.table("documents")
            .select("id")
            .eq("user_id", user_id)
            .eq("metadata->>file_path", storage_path)
            .limit(1)
            .execute()
        )
        return len(result.data) > 0
    except Exception as e:
        print(f"Error checking existing chunks: {e}")
        return False

# ========= RETRIEVER CLASS =========
class StaticRetriever(BaseRetriever):
    """A simple retriever that returns the provided docs as-is."""
    def __init__(self, docs: List[Document]):
        super().__init__()
        self._docs = docs

    def _get_relevant_documents(self, query: str) -> List[Document]:
        return self._docs

    @property
    def docs(self):
        return self._docs

# ========= RAG ROUTES =========
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
    allowed = {
        "application/pdf": ".pdf",
        "text/plain": ".txt",
        "text/csv": ".csv",
        "application/json": ".json"
    }

    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only PDF, TXT, URLs, CSV and json format are allowed.")

    file_data = await file.read()
    if not file_data:
        raise HTTPException(status_code=400, detail="File is empty.")

    # Generate storage name
    timestamp = int(time.time())
    clean_filename = file.filename.replace(" ", "_")
    storage_name = f"{timestamp}_{clean_filename}"

    print(f"[upload] Processing {file.filename} as {storage_name} (size: {len(file_data)} bytes)")
    print(f"[upload] User ID from auth: {user_id} (type: {type(user_id)})")

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
        insert_result = supabase_authenticated.table("knowledge_base").insert({
            "user_id": user_id, 
            "file_name": file.filename,
            "public_url": public_url,
            "storage_path": storage_name,
        }).execute()

        kb_id = insert_result.data[0]["id"]
    except Exception as e:
        print(f"[upload] Metadata save failed: {e}")
        try:
            supabase_authenticated.storage.from_("knowledge-base").remove([storage_name])
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Metadata save failed: {str(e)}")

    # Process document into chunks (skip if already exist)
    service_client = get_service_role_client()
    if check_document_chunks_exist(service_client, user_id, storage_name):
        print(f"[upload] Chunks already exist for {storage_name}")
        return {
            "message": "Document uploaded successfully. Chunks already exist in database.",
            "public_url": public_url,
            "chunks_created": False,
        }

    # Create document chunks
    chunks_created = False
    error_message = None
    try:
        docs: List[Document] = []
        ext = os.path.splitext(file.filename)[1].lower()

        if ext == ".pdf":
            docs = parse_pdf_bytes_to_docs(file_data, file.filename)
        elif ext == ".txt":
            text = file_data.decode("utf-8", errors="replace")
            if text.strip():
                docs = [Document(page_content=text, metadata={"source": file.filename})]
        elif ext == ".csv":
            import pandas as pd
            from io import BytesIO
            try:
                # Try reading CSV with error handling for malformed data
                df = pd.read_csv(
                    BytesIO(file_data),
                    on_bad_lines='skip',  # Skip bad lines
                    engine='python',      # More flexible parser
                    encoding='utf-8',
                    sep=None              # Auto-detect separator
                )
                # Convert DataFrame to readable text format
                text = df.to_string(index=False)
                docs = [Document(page_content=text, metadata={"source": file.filename})]
                print(f"[upload] CSV parsed successfully: {len(df)} rows, {len(df.columns)} columns")
            except Exception as csv_error:
                print(f"[upload] CSV parsing error: {csv_error}")
                # Fallback: treat as plain text
                try:
                    text = file_data.decode("utf-8", errors="replace")
                    docs = [Document(page_content=text, metadata={"source": file.filename})]
                    print(f"[upload] CSV processed as plain text fallback")
                except Exception:
                    docs = []
                    error_message = f"Failed to parse CSV: {str(csv_error)}"
        elif ext == ".json":
            import json
            try:
                json_data = json.loads(file_data.decode("utf-8"))
                text = json.dumps(json_data, indent=2)
                docs = [Document(page_content=text, metadata={"source": file.filename})]
            except Exception as json_error:
                print(f"[upload] JSON parsing error: {json_error}")
                docs = []
                error_message = f"Failed to parse JSON: {str(json_error)}"

        if docs:
            chunks = chunk_docs(docs)
            if chunks:
                # Add metadata to chunks
                for chunk in chunks:
                    chunk.metadata.update({
                        "title": file.filename, 
                        "file_path": storage_name, 
                        "user_id": user_id,
                        "user_email": user_id  
                    })

                # Generate embeddings and store
                embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
                vectors = embeddings.embed_documents([c.page_content for c in chunks])

                rows = [
                    {
                        "content": c.page_content, 
                        "metadata": c.metadata, 
                        "embedding": vectors[i], 
                        "user_id": user_id,
                        "kb_id": kb_id 
                    }
                    for i, c in enumerate(chunks)
                ]

                service_client.table("documents").insert(rows).execute()
                print(f"[upload] Successfully inserted {len(rows)} document chunks with user_id: {user_id}")
                chunks_created = True
            else:
                error_message = "No chunks could be created from the document"
        else:
            if not error_message:
                error_message = "No content could be extracted from the document"

    except Exception as e:
        print(f"[upload] Document processing failed: {e}")
        error_message = f"Document processing failed: {str(e)}"

    return {
        "message": "Document uploaded successfully." if chunks_created else "Document uploaded but processing failed.",
        "public_url": public_url, 
        "chunks_created": chunks_created,
        "kb_id": kb_id,
        "error": error_message if error_message else None,
        "warning": "Some CSV rows were skipped due to formatting issues" if ext == ".csv" and chunks_created else None
    }

@router.post("/add-url-knowledge-base/")
async def add_url_knowledge_base(
    url: str = Form(...),
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Fetch a webpage, extract text, and save it to knowledge base."""
    import requests
    from bs4 import BeautifulSoup

    supabase_authenticated = auth_data["client"]
    user_id = auth_data["user_id"]
    service_client = get_service_role_client()

    try:
        # Fetch and parse URL
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")
        text = soup.get_text(separator="\n")
        text = " ".join(text.split())[:100000]  # limit long text

        # Generate storage name for URL
        timestamp = int(time.time())
        storage_name = f"{timestamp}_url_content.txt"
        
        # Get page title for display
        page_title = soup.title.string if soup.title else url
        
        print(f"[add-url] Processing URL: {url} (title: {page_title})")

        # Store metadata in knowledge_base table first
        try:
            insert_result = supabase_authenticated.table("knowledge_base").insert({
                "user_id": user_id,
                "file_name": page_title,
                "public_url": url,  # Store original URL
                "storage_path": storage_name,  # Use generated storage path
            }).execute()

            kb_id = insert_result.data[0]["id"]
            print(f"[add-url] Created knowledge_base entry with kb_id: {kb_id}")
        except Exception as e:
            print(f"[add-url] Failed to create knowledge_base entry: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save URL metadata: {str(e)}")

        # Check if chunks already exist
        if check_document_chunks_exist(service_client, user_id, storage_name):
            print(f"[add-url] Chunks already exist for {storage_name}")
            return {
                "message": "URL added successfully. Chunks already exist in database.",
                "url": url,
                "chunks_created": False,
                "kb_id": kb_id
            }

        # Process into chunks
        docs = [Document(page_content=text, metadata={"source": url, "title": page_title})]
        chunks = chunk_docs(docs)
        
        if not chunks:
            return {
                "message": "No content could be extracted from URL.",
                "url": url,
                "chunks_created": False,
                "kb_id": kb_id
            }

        # Add metadata to chunks
        for chunk in chunks:
            chunk.metadata.update({
                "title": page_title,
                "file_path": storage_name,
                "user_id": user_id,
                "source": url
            })

        # Generate embeddings
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        vectors = embeddings.embed_documents([c.page_content for c in chunks])

        # Store in documents table with kb_id
        rows = [
            {
                "content": c.page_content,
                "metadata": c.metadata,
                "embedding": vectors[i],
                "user_id": user_id,
                "kb_id": kb_id,  # Link to knowledge_base entry
            }
            for i, c in enumerate(chunks)
        ]

        service_client.table("documents").insert(rows).execute()
        print(f"[add-url] Successfully inserted {len(rows)} document chunks with kb_id: {kb_id}")

        return {
            "message": "URL added successfully to knowledge base!",
            "url": url,
            "chunks_created": True,
            "chunk_count": len(rows),
            "kb_id": kb_id
        }
    except Exception as e:
        print(f"Error adding URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to process URL.")


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
        kb_id = document_info["id"]
    except Exception as e:
        print(f"Error fetching document info: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch document information.")

    # Check if chunks already exist
    if check_document_chunks_exist(service_client, user_id, storage_path):
        return {
            "message": "Chunks already exist for this document.", 
            "chunks_created": False, 
            "storage_path": storage_path
        }

    # Download and process file
    try:
        file_data = supabase_authenticated.storage.from_("knowledge-base").download(storage_path)
        
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

        chunks = chunk_docs(docs)
        if not chunks:
            return {
                "message": "No chunks created from document.", 
                "chunks_created": False, 
                "storage_path": storage_path
            }

        # Process chunks
        for chunk in chunks:
            chunk.metadata.update({
                "title": filename, 
                "file_path": storage_path, 
                "user_id": user_id
            })

        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        vectors = embeddings.embed_documents([c.page_content for c in chunks])

        rows = [
            {
                "content": c.page_content, 
                "metadata": c.metadata, 
                "embedding": vectors[i], 
                "user_id": user_id,
                "kb_id": kb_id
            }
            for i, c in enumerate(chunks)
        ]

        service_client.table("documents").insert(rows).execute()
        print(f"[process-existing] Successfully inserted {len(rows)} document chunks")

        return {
            "message": f"Successfully created {len(rows)} chunks for existing document.",
            "chunks_created": True,
            "storage_path": storage_path,
            "chunk_count": len(rows),
        }
        
    except Exception as e:
        print(f"Error processing existing document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@router.post("/query_audio/")
async def query_audio(
    audio: UploadFile = File(...), 
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Process audio and return transcribed text."""
    recognizer = sr.Recognizer()
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
        with sr.AudioFile(temp_path) as source:
            audio_data = recognizer.record(source)
            query_text = recognizer.recognize_google(audio_data)

        return JSONResponse(content={"query": query_text, "success": True})

    except sr.UnknownValueError:
        return JSONResponse(
            content={"error": "Could not understand audio", "query": "[No speech detected]"}, 
            status_code=400
        )
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
    kb_id: Optional[str] = Form(None),  # NEW: Filter by specific document
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Generate AI response for the given query - returns both text and audio; grounded to user's docs."""
    from .ai.speech import generate_tts_audio
    
    try:
        supabase_authenticated = auth_data["client"]
        user_id = auth_data["user_id"]
        q = (query or "").strip()

        service_client = get_service_role_client()

        print(f"[respond] Query: {q}, User: {user_id}, KB ID: {kb_id}")

        # Handle small talk
        smalltalk = detect_small_talk(q)
        if smalltalk:
            return {
                "answer_text": smalltalk,
                "sources": [],
                "audio_data": generate_tts_audio(smalltalk),
                "audio_type": "audio/wav",
            }

        # Check if user has documents (filtered by kb_id if provided)
        try:
            docs_check = (
                supabase_authenticated.table("documents")
                .select("id")
                .eq("user_id", user_id)
            )
            if kb_id:
                docs_check = docs_check.eq("kb_id", kb_id)
            
            docs_resp = docs_check.limit(1).execute()
            
            if not docs_resp.data:
                msg = "I don't have any documents for you yet. Please upload a file first." if not kb_id else "No documents found for the selected knowledge base."
                return {
                    "answer_text": msg,
                    "sources": [],
                    "audio_data": generate_tts_audio(msg),
                    "audio_type": "audio/wav",
                }
        except Exception as e:
            print(f"[respond] Error checking documents: {e}")

        # Retrieve relevant documents
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        query_vector = embeddings.embed_query(q)

        candidate_rows = []
        try:
            # Build RPC params with optional kb_id filter
            rpc_params = {
                "query_embedding": query_vector,
                "match_count": 5,
                "filter_user_id": user_id
            }
            
            # Try the simple RPC function first
            rpc_result = service_client.rpc("match_documents_simple", rpc_params).execute()
            
            if rpc_result.data:
                # Filter by kb_id if provided (client-side filter)
                if kb_id:
                    candidate_rows = [row for row in rpc_result.data if row.get("kb_id") == kb_id]
                else:
                    candidate_rows = rpc_result.data
                print(f"[respond] RPC search successful: {len(candidate_rows)} results")
        except Exception as e:
            print(f"[respond] RPC search failed: {e}")
            # Try the original function as fallback
            try:
                rpc_result = service_client.rpc(
                    "match_documents_v2",
                    {
                        "query_embedding": query_vector,
                        "match_count": 5,
                        "metadata_filter": {"user_id": user_id}
                    },
                ).execute()
                if rpc_result.data:
                    # Filter by kb_id if provided
                    if kb_id:
                        candidate_rows = [row for row in rpc_result.data if row.get("kb_id") == kb_id]
                    else:
                        candidate_rows = rpc_result.data
                    print(f"[respond] Fallback RPC successful: {len(candidate_rows)} results")
            except Exception as e2:
                print(f"[respond] Fallback RPC also failed: {e2}")

        # Fallback search methods
        if not candidate_rows:
            try:
                fallback_query = (
                    service_client.table("documents")
                    .select("content, metadata, embedding, kb_id")
                    .eq("user_id", user_id)
                )
                if kb_id:
                    fallback_query = fallback_query.eq("kb_id", kb_id)
                
                fallback = fallback_query.limit(20).execute()
                
                if fallback.data:
                    import numpy as np
                    qv = np.array(query_vector)
                    scored = []
                    for row in fallback.data:
                        dv = np.array(row["embedding"])
                        sim = float(np.dot(qv, dv) / (np.linalg.norm(qv) * np.linalg.norm(dv)))
                        scored.append((sim, row))
                    scored.sort(key=lambda x: x[0], reverse=True)
                    candidate_rows = [r for _, r in scored[:5]]
            except Exception:
                # Final fallback
                try:
                    simple_query = (
                        service_client.table("documents")
                        .select("content, metadata")
                        .eq("user_id", user_id)
                    )
                    if kb_id:
                        simple_query = simple_query.eq("kb_id", kb_id)
                    
                    simple = simple_query.limit(5).execute()
                    candidate_rows = simple.data or []
                except Exception as sfe:
                    print(f"[respond] Simple fallback failed: {sfe}")

        if not candidate_rows:
            answer = "I don't know based on the provided documents."
            return {
                "answer_text": answer,
                "sources": [],
                "audio_data": generate_tts_audio(answer),
                "audio_type": "audio/wav",
            }

        # Create QA chain
        retrieved_documents = [
            Document(page_content=row.get("content", ""), metadata=row.get("metadata", {}))
            for row in candidate_rows
        ]

        # Use Hugging Face LLM instead of Together API
        context_text = "\n\n".join([doc.page_content for doc in retrieved_documents])
        full_query = f"Context: {context_text}\n\nQuestion: {q}\n\nAnswer based on the context:"
        
        answer = make_llm_hf(full_query, temperature=0.1, max_tokens=512)
        answer = polish_answer(answer)

        sources = [
            {
                "title": doc.metadata.get("title"),
                "file_path": doc.metadata.get("file_path"),
                "page": doc.metadata.get("page"),
                "snippet": doc.page_content[:300],
            }
            for doc in retrieved_documents
        ]

        return {
            "answer_text": answer,
            "sources": sources,
            "audio_data": generate_tts_audio(answer),
            "audio_type": "audio/wav",
        }

    except Exception as e:
        print(f"[respond] Error: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@router.post("/internal/respond")
async def internal_respond(
    query: str = Form(...),
    user_id: str = Form(...),
    kb_id: str = Form(None),
):
    """
    Internal endpoint for agent to query knowledge base - returns only answer text.
    Uses service role client (no auth required).
    """
    try:
        service_client = get_service_role_client()

        # Filter documents by user_id and kb_id (or storage_path)
        docs_query = (
            service_client.table("documents")
            .select("*")
            .eq("user_id", user_id)
        )
        if kb_id:
            docs_query = docs_query.eq("kb_id", kb_id)
        docs = docs_query.execute().data

        if not docs:
            return {"answer_text": "No documents found for the given user and KB ID."}

        document = docs[0]
        retrieved_document = Document(page_content=document.get("content", ""), metadata=document.get("metadata", {}))
        context_text = retrieved_document.page_content
        
        return {"answer_text": context_text}

    except Exception as e:
        print(f"[internal respond] Error: {e}")
        return {"answer_text": "I'm sorry, I couldn't process your request right now."}


@router.post("/internal/fetch-chunks")
def fetch_chunks(user_id: str = Form(...)):
    """
    Return a list of uploaded chunk/document metadata for the given user.
    """
    try:
        service_client = get_service_role_client()
        result = service_client.table("knowledge_base").select("id, file_name, storage_path").eq("user_id", user_id).execute()
        chunks = result.data or []
        return {"chunks": chunks}
    except Exception as e:
        print("⚠️ Error fetching chunks:", e)
        return {"chunks": []}

@router.get("/debug/documents/{user_id}")
def debug_documents(user_id: str):
    """Debug endpoint to check documents table for a user_id"""
    try:
        service_client = get_service_role_client()
        
        # Check documents table
        docs_result = service_client.table("documents").select("id, user_id, metadata, kb_id").eq("user_id", user_id).limit(5).execute()
        
        # Check knowledge_base table
        kb_result = service_client.table("knowledge_base").select("id, user_id, file_name").eq("user_id", user_id).limit(5).execute()
        
        return {
            "user_id": user_id,
            "documents_count": len(docs_result.data) if docs_result.data else 0,
            "documents": docs_result.data or [],
            "knowledge_base_count": len(kb_result.data) if kb_result.data else 0,
            "knowledge_base": kb_result.data or []
        }
    except Exception as e:
        return {"error": str(e)}

# ========= PODCAST SCRIPT GENERATION =========
@router.post("/generate-podcast-script/")
async def generate_podcast_script(
    role: str = Form(...),  # "host" or "guest"
    topic: Optional[str] = Form(None),
    kb_id: Optional[str] = Form(None),  # NEW: Filter by specific document
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Generate a conversational 15-minute podcast script based on user's knowledge base"""
    try:
        supabase_authenticated = auth_data["client"]
        user_id = auth_data["user_id"]
        service_client = get_service_role_client()
        
        print(f"[script-gen] Generating {role} script for user: {user_id}, kb_id: {kb_id}")

        # Fetch user's document chunks - filter by kb_id if provided
        docs_query = (
            service_client.table("documents")
            .select("content, metadata")
            .eq("user_id", user_id)
        )
        
        # Filter by specific document if kb_id is provided
        if kb_id:
            docs_query = docs_query.eq("kb_id", kb_id)
            print(f"[script-gen] Filtering by kb_id: {kb_id}")
        
        docs_result = docs_query.limit(50).execute()

        if not docs_result.data:
            return {
                "error": "No documents found",
                "message": "Please upload documents to your knowledge base first." if not kb_id else "No documents found for the selected knowledge base."
            }

        all_content = "\n\n".join([doc["content"] for doc in docs_result.data])
        context_summary = all_content[:4000] + "..." if len(all_content) > 4000 else all_content

        # For ~15 minutes, set longer token limit
        config = {"segments": 10, "max_tokens": 4000}

        # --------------- UPDATED PROMPTS --------------- #
        if role == "host":
            prompt = f"""
You are the HOST in a podcast conversation with an expert guest.
Use the knowledge base below as background context (don't quote it directly):

{context_summary}

Generate a continuous 15-minute conversational script (~2000–2500 words) between the HOST and the GUEST.
Include only the dialogues — no headings, descriptions, or scene explanations.

Make it sound natural, insightful, and flowing, with smooth transitions between topics.
Change topics every few exchanges to keep it engaging — start from an introduction, move through insights, stories, and end with a natural closing.

Example format:
[HOST]: Welcome! I'm excited to have you here today.
[GUEST]: Thanks for having me, it's a pleasure.
[HOST]: Let's start with how you began your journey...
[GUEST]: It all started when...

Now, create the full conversation.
Topic: {topic if topic else "general insights based on the knowledge base"}
Keep tone professional yet friendly, with realistic pacing and topic changes."""
        else:
            prompt = f"""
You are the GUEST expert in a podcast conversation.
Use the knowledge base below as your background knowledge (don't quote it directly):

{context_summary}

Generate a continuous 15-minute dialogue (~2000–2500 words) between the HOST and the GUEST.
Include only the dialogues — no descriptions, segment labels, or outlines.

Make it natural, informative, and smooth. Change topics naturally — start with your introduction, move through key ideas, examples, and stories, and end with a thoughtful closing.

Example format:
[HOST]: It's great to have you on the show. Could you tell us a bit about your work?
[GUEST]: Absolutely! My work focuses on helping small businesses grow through...
[HOST]: That's fascinating. How do you see this evolving?

Topic: {topic if topic else "general insights based on the knowledge base"}
Keep the tone conversational and authentic, with back-and-forth rhythm between host and guest."""

        # ------------------------------------------------ #

        print(f"[script-gen] Calling LLM with {config['max_tokens']} max tokens")
        script_text = make_llm_hf(prompt, temperature=0.7, max_tokens=config['max_tokens'])
        
        if not script_text or len(script_text) < 50:
            return {
                "error": "Script generation failed",
                "message": "The AI couldn't generate a proper script. Please try again."
            }

        # Parse script
        sections = []
        lines = script_text.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if line.upper().startswith('[HOST]') or line.upper().startswith('HOST:'):
                content = line.split(':', 1)[-1].strip()
                sections.append({"speaker": "HOST", "content": content})
            elif line.upper().startswith('[GUEST]') or line.upper().startswith('GUEST:'):
                content = line.split(':', 1)[-1].strip()
                sections.append({"speaker": "GUEST", "content": content})
            elif sections:
                sections[-1]["content"] += " " + line

        if not sections and script_text:
            sections.append({
                "speaker": "HOST" if role == "host" else "GUEST",
                "content": script_text
            })

        word_count = len(script_text.split())
        return {
            "success": True,
            "script_text": script_text,
            "sections": sections,
            "metadata": {
                "role": role,
                "word_count": word_count,
                "estimated_duration": "≈15 minutes",
                "segment_count": len(sections),
                "generated_at": time.time(),
                "kb_id": kb_id
            }
        }
    except Exception as e:
        print(f"[script-gen] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Script generation failed: {str(e)}")