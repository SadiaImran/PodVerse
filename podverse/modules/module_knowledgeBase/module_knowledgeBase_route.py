from fastapi import APIRouter, File, UploadFile, Form, Header, HTTPException
from fastapi.params import Depends
from fastapi.responses import JSONResponse, FileResponse
from langchain_ollama import ChatOllama
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain.prompts import PromptTemplate
from langchain_core.documents import Document
from gtts import gTTS
import speech_recognition as sr
import os
import time
from datetime import datetime
from connection_supabase_client import supabase
from connection_supabase_client import get_authenticated_supabase_client
from supabase import Client

router = APIRouter()

llm = ChatOllama(model="mistral", temperature=0.7, num_predict=512)

custom_prompt = PromptTemplate(
    input_variables=["context", "question"],
    template="""
You are a helpful assistant. Use only the information in the context below to answer the user's question.

Tone: Friendly and informative. Use simple, easy-to-understand language.

Context:
{context}

Question:
{question}

Answer:
"""
)

router = APIRouter()

@router.get("/knowledge-base/")
async def get_knowledge_base_files(auth_data: dict = Depends(get_authenticated_supabase_client)):
    supabase_authenticated = auth_data["client"]
    user_id = auth_data["user_id"]

    try:
        response = supabase_authenticated.table("knowledge_base").select("*").eq("user_id", user_id).execute()
        knowledge_base = response.data
        return JSONResponse(content=knowledge_base)

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"An unexpected error occurred in the knowledge-base endpoint: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

@router.post("/upload-knowledge-base/")
async def upload_knowledge_base(
    file: UploadFile = File(...),
    auth_data: Client = Depends(get_authenticated_supabase_client)
):
    supabase_authenticated = auth_data["client"]
    user_id = auth_data["user_id"]

    # Define allowed content types
    allowed_content_types = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt"
    }

    if file.content_type not in allowed_content_types:
        raise HTTPException(status_code=400, detail="Only PDF TXT DOC files are allowed.")

  
    file_data = await file.read()
    timestamp = int(time.time())
    file_name = f"{timestamp}_{file.filename}"
    file_path = file_name

    try:
        upload_result = supabase_authenticated.storage.from_("knowledge-base").upload(
            file_path,
            file_data,
            {
                "content-type": file.content_type,
                "x-upsert": "false"
            }
        )
    except Exception as e:
        print(f"Supabase upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


    public_url = supabase_authenticated.storage.from_("knowledge-base").get_public_url(file_path)
    if not public_url:
        raise HTTPException(status_code=500, detail="Could not get public URL.")

    try:
        supabase_authenticated.table("knowledge_base").insert({
            "user_id": user_id,
            "file_name": file.filename,
            "public_url": public_url,
            "storage_path": file_path,
        }).execute()
    except Exception as e:
        print(f"Metadata save failed: {e}")
        raise HTTPException(status_code=500, detail=f"Metadata save failed: {str(e)}")

    return {
        "message": "Document uploaded successfully.",
        "public_url": public_url
    }

@router.post("/respond/")
async def generate_response(user_id: str = Form(...), query: str = Form(...)):
    try:
        
        res = supabase.storage.from_("knowledge-base").list(path=f"{user_id}/")
        files_res = res.get("data", []) if res else []

        print("📂 Checking files at path:", f"{user_id}/")
        print("📝 Files found:", [f["name"] for f in files_res])

        if not files_res:
            return JSONResponse(content={"error": "No PDFs found in knowledge-base storage for user"}, status_code=404)


        all_chunks = []

        for file_meta in files_res:
            filename = file_meta["name"]
            storage_path = f"{user_id}/{filename}"
            print(f"⬇️ Downloading: {storage_path}")

            # Download the PDF file
            download_res = supabase.storage.from_("knowledge-base").download(storage_path)

            if not download_res or download_res.get("data") is None:
                print(f"⚠️ Failed to download: {storage_path}")
                continue

            # Create a temporary file and write PDF contents
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
                tmp_file.write(download_res["data"])
                temp_pdf_path = tmp_file.name

            # Load and split PDF content
            loader = PyPDFLoader(temp_pdf_path)
            documents = loader.load()
            splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=100)
            chunks = splitter.split_documents(documents)

            for chunk in chunks:
                chunk.metadata["title"] = filename
                chunk.metadata["file_path"] = storage_path

            all_chunks.extend(chunks)

            # Clean up temp file
            os.remove(temp_pdf_path)

        if not all_chunks:
            return JSONResponse(content={"error": "No content extracted from PDFs."}, status_code=400)

        # Embedding & Retrieval
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        vector_store = FAISS.from_documents(all_chunks, embeddings)
        retriever = vector_store.as_retriever()

        retrieval_qa = RetrievalQA.from_chain_type(
            llm=llm,
            retriever=retriever,
            chain_type="stuff",
            chain_type_kwargs={"prompt": custom_prompt},
            return_source_documents=True
        )

        # Generate response
        result = retrieval_qa.invoke({"query": query})
        answer = result["result"]
        sources = result["source_documents"]

        source_info = [
            {"title": doc.metadata.get("title"), "file_path": doc.metadata.get("file_path")} for doc in sources
        ]

        # Text-to-Speech audio
        audio_filename = f"response_{user_id}.mp3"
        tts = gTTS(answer)
        tts.save(audio_filename)

        return {
            "answer_text": answer,
            "sources": source_info,
            "audio_file_url": f"/audio/{audio_filename}"
        }

    except Exception as e:
        return JSONResponse(content={"error": f"generate_response failed: {str(e)}"}, status_code=500)

