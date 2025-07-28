from fastapi import APIRouter, File, UploadFile, Form, Header, HTTPException
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
import shutil
import tempfile
import os
import re
from datetime import datetime
from connection_supabase_client import supabase
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")



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

@router.post("/upload_pdf/")
async def upload_pdf(
    user_id: str = Form(...),
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    try:
        # 1. Validate JWT
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authorization token missing or invalid")
        user_token = authorization.split(" ")[1]

        # 2. Initialize Supabase client with user's JWT
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        supabase.postgrest.auth(user_token)  # sets RLS context

        # 3. Save file temporarily
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 4. Upload PDF to Supabase Storage (private bucket)
        storage_path = f"{user_id}/{datetime.utcnow().timestamp()}_{file.filename}"
        with open(temp_path, "rb") as f:
            storage_res = supabase.storage.from_("knowledge-base").upload(storage_path, f)

        if storage_res.status_code != 200:
            os.remove(temp_path)
            raise HTTPException(status_code=400, detail=f"Storage upload failed: {storage_res.json()}")

        # 5. Extract text from PDF
        loader = PyPDFLoader(temp_path)
        documents = loader.load()
        splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=100)
        chunks = splitter.split_documents(documents)

        # 6. Insert chunks into knowledge_base table
        for chunk in chunks:
            insert_res = supabase.table("knowledge_base").insert({
                "user_id": user_id,
                "title": file.filename,
                "source_type": "pdf",
                "chunk": chunk.page_content,
                "file_path": storage_path
            }).execute()

            if insert_res.status_code >= 400:
                os.remove(temp_path)
                raise HTTPException(status_code=400, detail=f"DB insert failed: {insert_res.json()}")

        # 7. Cleanup
        os.remove(temp_path)
        return JSONResponse(content={"message": "PDF processed and stored successfully"}, status_code=200)

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@router.post("/query_audio/")
async def query_audio(user_id: str = Form(...), audio: UploadFile = File(...)):
    recognizer = sr.Recognizer()
    audio_path = f"temp_{audio.filename}"
    with open(audio_path, "wb") as f:
        f.write(await audio.read())

    if os.path.getsize(audio_path) == 0:
        return JSONResponse(content={"error": "Uploaded audio file is empty"}, status_code=400)

    try:
        with sr.AudioFile(audio_path) as source:
            audio_data = recognizer.record(source)
            query_text = recognizer.recognize_google(audio_data)
    except sr.UnknownValueError:
        return JSONResponse(content={"error": "Could not understand audio"}, status_code=400)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        os.remove(audio_path)

    response = await generate_response(user_id=user_id, query=query_text)
    response["query"] = query_text
    return response


@router.post("/respond/")
async def generate_response(user_id: str = Form(...), query: str = Form(...)):
    # Fetch user's chunks from Supabase
    response = supabase.table("knowledge_base").select("*").eq("user_id", user_id).execute()
    if not response.data:
        return JSONResponse(content={"error": "No knowledge base found for user"}, status_code=404)

    docs = [Document(page_content=doc["chunk"], metadata=doc) for doc in response.data]

    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    vector_store = FAISS.from_documents(docs, embeddings)
    retriever = vector_store.as_retriever()

    retrieval_qa = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type="stuff",
        chain_type_kwargs={"prompt": custom_prompt},
        return_source_documents=True
    )

    result = retrieval_qa.invoke({"query": query})
    answer = result["result"]
    sources = result["source_documents"]

    if not sources:
        return {
            "answer_text": "I'm sorry, I couldn't find relevant information in the uploaded documents.",
            "sources": [],
            "audio_file_url": None
        }

    source_info = [
        {"title": doc.metadata.get("title"), "file_path": doc.metadata.get("file_path")}
        for doc in sources
    ]

    audio_filename = f"response_{user_id}.mp3"
    tts = gTTS(answer)
    tts.save(audio_filename)

    return {
        "answer_text": answer,
        "sources": source_info,
        "audio_file_url": f"/audio/{audio_filename}"
    }

@router.get("/audio/{filename}")
async def get_audio(filename: str):
    if not os.path.exists(filename):
        return JSONResponse(content={"error": "Audio file not found"}, status_code=404)
    return FileResponse(filename, media_type="audio/mpeg", filename=filename)
