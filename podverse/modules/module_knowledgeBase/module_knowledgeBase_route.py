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

# @router.post("/upload_pdf/")
# async def upload_pdf(
#     user_id: str = Form(...),
#     file: UploadFile = File(...),
#     authorization: str = Header(None)
# ):
#     try:
#         # 1. Validate JWT
#         if not authorization or not authorization.startswith("Bearer "):
#             raise HTTPException(status_code=401, detail="Authorization token missing or invalid")
#         user_token = authorization.split(" ")[1]

#         # 2. Initialize Supabase client with user's JWT
#         supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
#         supabase.postgrest.auth(user_token)  # sets RLS context

#         # 3. Save file temporarily
#         temp_path = f"temp_{file.filename}"
#         with open(temp_path, "wb") as buffer:
#             shutil.copyfileobj(file.file, buffer)

#         # 4. Upload PDF to Supabase Storage (private bucket)
#         storage_path = f"{user_id}/{datetime.utcnow().timestamp()}_{file.filename}"
#         with open(temp_path, "rb") as f:
#             storage_res = supabase.storage.from_("knowledge-base").upload(storage_path, f)

#         if storage_res.status_code != 200:
#             os.remove(temp_path)
#             raise HTTPException(status_code=400, detail=f"Storage upload failed: {storage_res.json()}")

#         # 5. Extract text from PDF
#         loader = PyPDFLoader(temp_path)
#         documents = loader.load()
#         splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=100)
#         chunks = splitter.split_documents(documents)

#         # 6. Insert chunks into knowledge_base table
#         for chunk in chunks:
#             insert_res = supabase.table("knowledge_base").insert({
#                 "user_id": user_id,
#                 "title": file.filename,
#                 "source_type": "pdf",
#                 "chunk": chunk.page_content,
#                 "file_path": storage_path
#             }).execute()

#             if insert_res.status_code >= 400:
#                 os.remove(temp_path)
#                 raise HTTPException(status_code=400, detail=f"DB insert failed: {insert_res.json()}")

#         # 7. Cleanup
#         os.remove(temp_path)
#         return JSONResponse(content={"message": "PDF processed and stored successfully"}, status_code=200)

#     except Exception as e:
#         return JSONResponse(content={"error": str(e)}, status_code=500)


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

    try:
        response_data = await generate_response(user_id=user_id, query=query_text)
        if isinstance(response_data, JSONResponse):
            content = response_data.body.decode("utf-8")
            import json
            content_json = json.loads(content)
            content_json["query"] = query_text
            return JSONResponse(content=content_json)
        else:
            response_data["query"] = query_text
            print("🎤 Audio query received")
            print("Query text:", query_text)
            print("Response data:", response_data)
            return JSONResponse(content=response_data)
    except Exception as e:
        return JSONResponse(content={"error": f"Failed to generate response: {str(e)}"}, status_code=500)




@router.post("/respond/")
async def generate_response(user_id: str = Form(...), query: str = Form(...)):
    try:
        # ✅ FIXED: List files properly from Supabase
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

