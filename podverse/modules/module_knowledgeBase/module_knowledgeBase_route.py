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
import os, json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity 
import time
import tempfile
import re
from typing import Dict, Optional, List
from dotenv import load_dotenv
from gradio_client import Client
import requests

from connection_supabase_client import (
    get_authenticated_supabase_client,
    get_service_role_client,
    get_gradio_client
)

router = APIRouter()

# ========= CONFIGURATION =========
load_dotenv()

TOGETHER_API_KEY = os.environ.get("TOGETHER_API_KEY")
TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions"
TOGETHER_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

# Global client variable for LLM
client = None

# Small talk patterns
SMALL_TALK_PATTERNS: Dict[str, str] = {
    r"^\s*(hi|hello|hey)(?:\s+how\s+are\s+you)?\b": "Hi there! Thanks for having me on the show, I'm doing fantastic! How about you?",
    r"\b(thank(s)?|thank you|appreciate it)\b": "You're so welcome! I'm thrilled to be here and excited about our chat!",
    r"\b(bye|goodbye|see ya|see you)\b": "Thank you for having me! This was absolutely wonderful, take care!",
}

# ========= LLM SETUP =========
def make_llm_hf(query: str, temperature=0.1, max_tokens=512):
    """Use Hugging Face LLM for document Q&A"""
    global client
    if not client:
        client = get_gradio_client()
    try:
        result = client.predict(
            message=query,
            api_name="/chat"
        )
        return result
    except Exception as e:
        print(f"❌ Hugging Face LLM Error: {e}")
        return "I'm sorry, I couldn't process your request right now."

def make_llm_together(query: str, temperature=0.1, max_tokens=512):
    """Use Together API for generating responses"""
    if not TOGETHER_API_KEY:
        print("❌ TOGETHER_API_KEY not found in environment")
        return "I'm sorry, I couldn't process your request right now."
    
    try:
        response = requests.post(
            TOGETHER_API_URL,
            headers={
                "Authorization": f"Bearer {TOGETHER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": TOGETHER_MODEL,
                "messages": [{"role": "user", "content": query}],
                "max_tokens": max_tokens,
                "temperature": temperature
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result["choices"][0]["message"]["content"]
        else:
            print(f"❌ Together API Error: {response.status_code} - {response.text}")
            return "I'm sorry, I couldn't process your request right now."
            
    except Exception as e:
        print(f"❌ Together API Error: {e}")
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
                    qv = np.array(query_vector, dtype=np.float32)
                    scored = []
                    for row in fallback.data:
                        try:
                            # Ensure embedding is a proper numeric array
                            embedding_data = row["embedding"]
                            if isinstance(embedding_data, str):
                                import json
                                embedding_data = json.loads(embedding_data)
                            
                            dv = np.array(embedding_data, dtype=np.float32)
                            
                            # Validate that both vectors have the same shape
                            if qv.shape == dv.shape:
                                sim = float(np.dot(qv, dv) / (np.linalg.norm(qv) * np.linalg.norm(dv)))
                                scored.append((sim, row))
                        except Exception as e:
                            print(f"[respond] Warning: Failed to process embedding: {e}")
                            continue
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
    kb_id: Optional[str] = Form(None),
):
    """
    Internal endpoint for agent to query knowledge base - returns only answer text.
    Uses service role client (no auth required).
    """
    try:
        start_time = time.time()
        service_client = get_service_role_client()
        q = (query or "").strip()

        print(f"[internal/respond] 🔍 Processing query: {q[:60]}... for user={user_id}, kb_id={kb_id}")

        # 1️⃣ Handle small talk
        smalltalk = detect_small_talk(q)
        if smalltalk:
            return {"answer_text": smalltalk}

        # 1.5️⃣ Special handling for initial context queries (faster response)
        is_initial_query = any(phrase in q.lower() for phrase in ["what is this document about", "tell me about the document", "what is this about"])
        if is_initial_query:
            print(f"[internal/respond] 🚀 Fast initial context query detected")
            # Use smaller limit for faster response
            fallback_query = (
                service_client.table("documents")
                .select("content, metadata, embedding, kb_id")
                .eq("user_id", user_id)
            )
            if kb_id:
                fallback_query = fallback_query.eq("kb_id", kb_id)
            
            fallback = fallback_query.limit(5).execute()  # Very small limit for speed
            if fallback.data:
                # Just return the first few chunks as context
                context_parts = [doc["content"][:500] for doc in fallback.data[:3]]  # First 500 chars of top 3 docs
                context_text = "\n\n".join(context_parts)
                print(f"[internal/respond] ⚡ Fast initial context: {len(context_text)} chars")
                return {"answer_text": context_text}

        # 2️⃣ Get embeddings for query
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        query_vector = embeddings.embed_query(q)
        qv = np.array(query_vector, dtype=np.float32).reshape(1, -1)

        # 3️⃣ Fetch candidate docs from DB (with proper filters)
        fallback_query = (
            service_client.table("documents")
            .select("content, metadata, embedding, kb_id")
            .eq("user_id", user_id)
        )
        if kb_id:
            fallback_query = fallback_query.eq("kb_id", kb_id)

        # Optimized limit for faster initial context fetch
        fallback = fallback_query.limit(20).execute()
        candidate_rows = []

        # 4️⃣ Compute cosine similarity
        if fallback.data:
            scored = []
            for row in fallback.data:
                emb = row.get("embedding")
                if not emb:
                    continue
                try:
                    if isinstance(emb, str):
                        emb = json.loads(emb)
                    dv = np.array(emb, dtype=np.float32).reshape(1, -1)
                    score = float(cosine_similarity(qv, dv)[0][0])
                    scored.append((score, row))
                except Exception as e:
                    print(f"[respond] ⚠️ embed parse fail: {e}")
                    continue

            # sort high→low and keep top 5
            scored.sort(key=lambda x: x[0], reverse=True)
            candidate_rows = [r for _, r in scored[:5]]

            if scored:
                avg_score = np.mean([s for s, _ in scored[:5]])
                print(f"[respond] ✅ Found {len(candidate_rows)} top chunks (avg score={avg_score:.3f})")
            else:
                print(f"[respond] ⚠️ No scored matches found.")

        # 5️⃣ Fallback if no embeddings matched
        if not candidate_rows:
            if fallback.data:
                print(f"[internal/respond] ⚠️ Embedding similarity failed, using text fallback")
                # simple fuzzy fallback
                import difflib
                matches = sorted(
                    fallback.data,
                    key=lambda r: difflib.SequenceMatcher(None, q.lower(), r["content"].lower()).ratio(),
                    reverse=True,
                )
                candidate_rows = matches[:3]
            else:
                answer = "I don't know based on the provided documents."
                return {"answer_text": answer}

        # 6️⃣ Merge top chunks as context
        retrieved_documents = [
            Document(page_content=row.get("content", ""), metadata=row.get("metadata", {}))
            for row in candidate_rows
        ]
        context_text = "\n\n".join([doc.page_content for doc in retrieved_documents])

        elapsed = time.time() - start_time
        print(f"[internal/respond] ⏱️ Query processed in {elapsed:.2f}s, found {len(candidate_rows)} relevant chunks")

        return {"answer_text": context_text}

    except Exception as e:
        print(f"[internal/respond] ❌ Error: {e}")
        return {"answer_text": "I'm sorry, I couldn't process your request right now."}


@router.post("/internal/fetch-chunks")
def fetch_chunks(kb_id: str = Form(...)):
    """
    Return a list of chunks/documents for the given knowledge base ID.
    """
    try:
        service_client = get_service_role_client()
        result = (
            service_client.table("documents")
            .select("id, content, metadata, kb_id")
            .eq("kb_id", kb_id)
            .execute()
        )
        chunks = result.data or []
        print(f"📄 Fetched {len(chunks)} chunks for kb_id: {kb_id}")
        return {"chunks": chunks}
    except Exception as e:
        print(f"⚠️ Error fetching chunks for kb_id {kb_id}: {e}")
        return {"chunks": []}

@router.post("/internal/get-document-summary")
async def get_document_summary(
    user_id: str = Form(...),
    kb_id: Optional[str] = Form(None)
):
    """
    Fetch all chunks for a user/kb and return them as raw text for Google LLM to summarize.
    """
    try:
        service_client = get_service_role_client()
        
        # Build query
        query = service_client.table("documents").select("content, metadata")
        
        if kb_id:
            query = query.eq("kb_id", kb_id)
            print(f"📄 Fetching chunks for kb_id: {kb_id}")
        else:
            query = query.eq("user_id", user_id)
            print(f"📄 Fetching all chunks for user_id: {user_id}")
        
        result = query.limit(50).execute()  # Limit to prevent huge responses
        chunks = result.data or []
        
        if not chunks:
            return {"summary": "No documents found for this knowledge base."}
        
        # Combine all chunk content
        all_content = "\n\n".join([chunk.get("content", "") for chunk in chunks])
        
        print(f"📄 Fetched {len(chunks)} chunks, total content: {len(all_content)} chars")
        
        # Return raw content for Google LLM to process
        return {"summary": all_content}
        
    except Exception as e:
        print(f"⚠️ Error fetching document summary for kb_id {kb_id}: {e}")
        return {"summary": "Error fetching document content."}


@router.post("/internal/get-conversation-flow")
async def get_conversation_flow(
    user_id: str = Form(...),
    kb_id: str = Form(...)
):
    """
    Generate a structured conversation flow with topics and questions
    based on the user's knowledge base content.
    ADAPTIVE: More topics for longer documents, covering content sequentially.
    Uses only togther LLM.
    """
    try:
        service_client = get_service_role_client()
        
        # Fetch ALL document chunks in order
        docs = (
            service_client.table("documents")
            .select("content, metadata")
            .eq("kb_id", kb_id)
            .eq("user_id", user_id)
            .order("id")  # Maintain document order
            .execute()
        )
        
        if not docs.data:
            return {"flow": [], "error": "No documents found", "success": False}
        
        # Calculate document size metrics
        total_chunks = len(docs.data)
        total_chars = sum(len(d.get("content", "")) for d in docs.data)
        total_words = total_chars // 5  # Rough word estimate
        
        print(f"📊 Document stats: {total_chunks} chunks, ~{total_words} words, {total_chars} chars")
        
        # ADAPTIVE TOPIC COUNT based ONLY on document size
        if total_words < 1000:
            num_topics = 3
        elif total_words < 3000:
            num_topics = 5
        elif total_words < 5000:
            num_topics = 7
        elif total_words < 10000:
            num_topics = 10
        elif total_words < 20000:
            num_topics = 15
        else:
            num_topics = 20  # Cap at 20 topics for very long documents
        
        print(f"📋 Generating {num_topics} topics to cover {total_chunks} chunks sequentially")
        
        # Divide chunks evenly among topics to ensure full coverage
        chunks_per_topic = max(1, total_chunks // num_topics)
        
        # Get document title from metadata
        doc_title = "the document"
        if docs.data and docs.data[0].get("metadata"):
            raw_title = docs.data[0]["metadata"].get("title", "the document")
            doc_title = os.path.splitext(raw_title)[0] 
        
        print(f"📋 Generating flow for: {doc_title} ({chunks_per_topic} chunks per topic)")
        
        # Build sections of content for each topic
        topic_contents = []
        for i in range(num_topics):
            start_idx = i * chunks_per_topic
            end_idx = min((i + 1) * chunks_per_topic, total_chunks)
            
            # Handle last topic - include any remaining chunks
            if i == num_topics - 1:
                end_idx = total_chunks
            
            section_content = "\n\n".join([
                docs.data[j]["content"] 
                for j in range(start_idx, end_idx)
            ])
            
            topic_contents.append({
                "section_num": i + 1,
                "content": section_content[:3000],  # Limit each section for prompt
                "chunk_range": f"{start_idx+1}-{end_idx}"
            })
        
        # Create comprehensive prompt
        sections_preview = "\n\n".join([
            f"SECTION {t['section_num']} (chunks {t['chunk_range']}):\n{t['content'][:800]}..."
            for t in topic_contents[:8]  # Show first 8 sections as examples
        ])
        
        flow_prompt = f"""You are creating a podcast conversation plan STRICTLY about "{doc_title}".

RULES FOR QUESTION GENERATION:
1. Questions MUST reference specific content from the document
2. Questions MUST ask about topics that are actually in the document
3. Questions MUST NOT assume external knowledge
4. Questions MUST NOT ask "why" broadly - ask specifically about what's in the content
5. Questions MUST build on what's actually written, not what might be implied

Example GOOD questions:
- "You mention X in the document - can you expand on that?"
- "This section discusses Y - how does that work?"

Example BAD questions (DO NOT USE):
- "What do you think about Z?" (if Z isn't in document)
- "How would you approach..." (generic question)
- "Why did you decide..." (assumes external motivation)

You are to OUTPUT STRICTLY VALID JSON ONLY — nothing else, no text before or after.
The JSON must follow this exact schema:
{{
  "topics": [
    {{"title": "string", "questions": ["string", "string", "string"]}}
  ]
}}
Do not include explanations, numbering, or Markdown fences.

Generate {num_topics} topics with 2-3 questions each. Every question must be traceable to actual content in the document.

Here's the content:
{sections_preview}

Create podcast questions that explore ONLY what's in this content. Be specific and reference the actual material.
"""
        
        # Try Together LLM
        try:
            print("🤖 Using Together LLM for flow generation...")
            response = make_llm_together(flow_prompt, temperature=0.3, max_tokens=3000)
            
            # Clean up response
            cleaned = response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            # Try to parse
            flow_data = json.loads(cleaned)
            
            # Validate structure
            if "topics" in flow_data and len(flow_data["topics"]) >= num_topics - 2:
                print(f"✅ Flow generated via Together: {len(flow_data['topics'])} topics")
                return {
                    "flow": flow_data, 
                    "success": True, 
                    "method": "together", 
                    "doc_size": total_words,
                    "coverage": f"{len(flow_data['topics'])} topics covering {total_chunks} chunks"
                }
            else:
                print(f"⚠️ Together response has {len(flow_data.get('topics', []))} topics, expected {num_topics}")
                raise ValueError("Insufficient topics generated")
                
        except Exception as together_error:
            print(f"⚠️ Together flow generation failed: {together_error}")
            print(f"   Raw response: {response[:500] if 'response' in locals() else 'No response'}")
        
        # SEQUENTIAL FALLBACK - Divide document into equal sections
        print(f"📋 Using sequential fallback: dividing document into {num_topics} sections")
        
        topics = []
        
        # Always start with introduction
        intro_content = "\n".join([docs.data[i]["content"][:500] for i in range(min(3, total_chunks))])
        topics.append({
            "title": "Introduction & Overview",
            "questions": [
                f"Tell us about {doc_title} - what are we diving into today?",
                "What's the main purpose of this work?",
                "Who should care about this and why?"
            ]
        })
        
        # Create topics for middle sections sequentially
        for i in range(1, num_topics - 1):
            start_idx = i * chunks_per_topic
            end_idx = min((i + 1) * chunks_per_topic, total_chunks)
            
            # Get content snippet for this section
            section_snippet = ""
            for j in range(start_idx, min(end_idx, start_idx + 2)):
                if j < len(docs.data):
                    section_snippet += docs.data[j]["content"][:300] + " "
            
            # Extract a topic hint from the content (first sentence or heading-like text)
            topic_hint = "Discussion"
            lines = [l.strip() for l in section_snippet.split('\n') if l.strip()]
            if lines:
                first_line = lines[0][:60]
                # Clean it up
                first_line = re.sub(r'[^\w\s-]', '', first_line).strip()
                if len(first_line) > 10:
                    topic_hint = first_line
            
            topics.append({
                "title": f"Part {i}: {topic_hint}",
                "questions": [
                    f"Walk us through this section - what's happening here?",
                    f"What are the key points in this part?",
                    f"Can you elaborate on the details?"
                ]
            })
        
        # Always end with conclusion/wrap-up
        conclusion_content = "\n".join([docs.data[i]["content"][:500] for i in range(max(0, total_chunks - 3), total_chunks)])
        topics.append({
            "title": "Conclusions & Final Thoughts",
            "questions": [
                "What are the main takeaways from all of this?",
                "How does everything come together?",
                "What should listeners remember most?"
            ]
        })
        
        fallback_flow = {
            "doc_title": doc_title,
            "topics": topics
        }
        
        print(f"✅ Sequential fallback flow created with {len(topics)} topics covering chunks 1-{total_chunks}")
        return {
            "flow": fallback_flow, 
            "success": True, 
            "fallback": True, 
            "method": "sequential_division",
            "doc_size": total_words,
            "total_chunks": total_chunks,
            "chunks_per_topic": chunks_per_topic
        }
        
    except Exception as e:
        print(f"❌ Error generating conversation flow: {e}")
        import traceback
        traceback.print_exc()
        
        # Emergency fallback
        emergency_flow = {
            "doc_title": "your work",
            "topics": [
                {
                    "title": "Introduction",
                    "questions": [
                        "Tell us what we're exploring today",
                        "What's the overview?"
                    ]
                },
                {
                    "title": "Main Content - Part 1",
                    "questions": [
                        "Walk us through the first part",
                        "What's important here?"
                    ]
                },
                {
                    "title": "Main Content - Part 2",
                    "questions": [
                        "What comes next?",
                        "Tell us more about this section"
                    ]
                },
                {
                    "title": "Conclusions",
                    "questions": [
                        "What are the key takeaways?",
                        "Final thoughts?"
                    ]
                }
            ]
        }
        
        return {"flow": emergency_flow, "success": True, "fallback": True, "emergency": True}

# ========= PODCAST SCRIPT GENERATION =========
@router.post("/generate-podcast-script/")
async def generate_podcast_script(
    role: str = Form(...),  # "host" or "guest"
    topic: Optional[str] = Form(None),
    kb_id: Optional[str] = Form(None),  # NEW: Filter by specific document
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Generate a conversational podcast script STRICTLY based on user's knowledge base - NO fictional content"""
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
                "message": "Please upload documents to your knowledge base first." if not kb_id else "No documents found for the selected knowledge base.",
                "success": False
            }

        # Combine all document content
        all_content = "\n\n".join([doc["content"] for doc in docs_result.data])
        
        # Check if we have enough content
        if len(all_content.strip()) < 100:
            return {
                "error": "Insufficient content",
                "message": "Your knowledge base doesn't have enough content to generate a meaningful podcast script. Please upload more detailed documents.",
                "success": False
            }

        # Use more content for better context (up to 5000 chars)
        context_summary = all_content[:5000] + "..." if len(all_content) > 5000 else all_content
        content_word_count = len(all_content.split())

        print(f"[script-gen] KB content: {content_word_count} words, {len(docs_result.data)} documents")

        # For ~15 minutes, set longer token limit
        config = {"segments": 10, "max_tokens": 4000}

        # --------------- STRICT RAG PROMPTS --------------- #
        if role == "host":
            prompt = f"""
You are the HOST in a podcast conversation with an expert guest.

CRITICAL INSTRUCTIONS:
1. Use ONLY the information provided in the knowledge base below
2. DO NOT invent, assume, or create any information that is not in the knowledge base
3. If the knowledge base lacks information on something, the HOST should acknowledge it naturally
4. Every statement must be directly supported by the knowledge base content

Knowledge Base Content:
{context_summary}

Generate a natural podcast conversation (~2000 words) between HOST and GUEST.
The GUEST is an expert on the topics covered in the knowledge base.

Rules:
- Only discuss topics that are explicitly covered in the knowledge base
- If the knowledge base is limited, create a shorter, focused conversation
- Use conversational language but stay factually accurate to the source material
- Include only dialogues - no headings, descriptions, or scene explanations

Format:
[HOST]: Welcome to the show! Today we're discussing [topic from KB].
[GUEST]: Thanks for having me. I'm excited to share insights about [specific topic from KB].
[HOST]: Let's start with [question based on KB content]...
[GUEST]: [Answer using only KB information]...

Topic Focus: {topic if topic else "topics from the knowledge base"}

Create the conversation now, using ONLY information from the knowledge base provided above."""

        else:  # guest
            prompt = f"""
You are the GUEST expert in a podcast conversation.

CRITICAL INSTRUCTIONS:
1. You can ONLY discuss information that is in the knowledge base below
2. DO NOT invent facts, stories, or examples that are not in the knowledge base
3. If asked about something not in the KB, politely redirect to topics you can discuss
4. Every answer must be traceable to the knowledge base content

Your Knowledge Base:
{context_summary}

Generate a natural podcast dialogue (~2000 words) between HOST and GUEST.
You are the GUEST who is an expert on the topics in the knowledge base.

Rules:
- Answer questions using ONLY information from the knowledge base
- If the knowledge base is limited, keep the conversation shorter and more focused
- Be conversational but factually accurate to the source material
- Include only dialogues - no descriptions or labels

Format:
[HOST]: Welcome! Can you tell us about [topic from KB]?
[GUEST]: Absolutely. [Explain using only KB content]...
[HOST]: That's interesting. How does [related KB topic] work?
[GUEST]: [Answer based only on KB information]...

Topic Focus: {topic if topic else "topics from the knowledge base"}

Create the conversation now, discussing ONLY what is covered in the knowledge base above."""

        # ------------------------------------------------ #

        print(f"[script-gen] Calling LLM with {config['max_tokens']} max tokens (STRICT RAG mode)")
        script_text = make_llm_together(prompt, temperature=0.3, max_tokens=config['max_tokens'])  # Lower temp for more factual
        
        if not script_text or len(script_text) < 50:
            return {
                "error": "Script generation failed",
                "message": "The AI couldn't generate a proper script. Please try again or add more content to your knowledge base.",
                "success": False
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
                if content:  # Only add non-empty content
                    sections.append({"speaker": "HOST", "content": content})
            elif line.upper().startswith('[GUEST]') or line.upper().startswith('GUEST:'):
                content = line.split(':', 1)[-1].strip()
                if content:  # Only add non-empty content
                    sections.append({"speaker": "GUEST", "content": content})
            elif sections:  # Continue previous speaker's content
                sections[-1]["content"] += " " + line

        # Fallback: If parsing failed but we have script text
        if not sections and script_text:
            sections.append({
                "speaker": "HOST" if role == "host" else "GUEST",
                "content": script_text
            })

        # Validate we have meaningful content
        if not sections or len(sections) < 3:
            return {
                "error": "Insufficient script generated",
                "message": "The knowledge base content may be too limited to generate a full conversation. Please add more detailed information.",
                "success": False,
                "sections": sections  # Return what we have
            }

        word_count = len(script_text.split())
        estimated_duration = max(1, word_count // 150)  # ~150 words per minute

        return {
            "success": True,
            "script_text": script_text,
            "sections": sections,
            "metadata": {
                "role": role,
                "word_count": word_count,
                "kb_word_count": content_word_count,
                "estimated_duration": f"≈{estimated_duration} minutes",
                "segment_count": len(sections),
                "generated_at": time.time(),
                "kb_id": kb_id,
                "mode": "strict_rag",
                "note": "Script generated using only knowledge base content - no fictional information added"
            },
            "warning": "Script is based solely on your uploaded documents. Quality depends on the content in your knowledge base." if content_word_count < 500 else None
        }
        
    except Exception as e:
        print(f"[script-gen] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Script generation failed: {str(e)}")