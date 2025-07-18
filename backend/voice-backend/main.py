from fastapi import FastAPI, UploadFile, Form, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import List
from uuid import uuid4
import os
import shutil
import tempfile
from dotenv import load_dotenv
from datetime import datetime
from config import knowledge_base_collection 

# Custom modules
# from app.coqui_pipeline import clone_voice  
from router.default_voices_route import router as default_voices_router
from config import db  

# LangChain + Google Gemini RAG
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain.chains import RetrievalQA
from langchain import PromptTemplate

# ──────────────────────── SETUP ─────────────────────────────
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

app = FastAPI()

# MongoDB connect check
@app.on_event("startup")
async def startup_event():
    try:
        await db.command("ping")
        print("🟢 MongoDB connected successfully!")
    except Exception as e:
        print("🔴 MongoDB connection failed:", e)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "audio"
OUTPUT_DIR = "output"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app.mount("/output", StaticFiles(directory="output"), name="output")

# ─────────────── VOICE CLONING ENDPOINT ─────────────────────

@app.post("/voice-clone/")
async def voice_clone_upload(file_upload: List[UploadFile], text: str = Form(...)):
    file_names = []
    file_paths = []

    for file in file_upload:
        data = await file.read()
        save_to = os.path.join(UPLOAD_DIR, file.filename)
        file_paths.append(save_to)

        with open(save_to, "wb") as f:
            f.write(data)
        file_names.append(file.filename)

    output_filename = f"{uuid4().hex}_cloned_output.wav"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    # clone_voice(text_input=text, speaker_paths=file_paths, output_path=output_path)

    return JSONResponse({
        "output_audio": f"/{output_path}"
    })

# ─────────────── PDF RAG: INITIALIZE ONCE ───────────────────

# model = ChatGoogleGenerativeAI(
#     model="gemini-1.5-pro-latest",
#     google_api_key=GOOGLE_API_KEY,
#     temperature=0.2,
#     convert_system_message_to_human=False
# )

# embedding_model = GoogleGenerativeAIEmbeddings(
#     model="models/text-embedding-004",
#     google_api_key=GOOGLE_API_KEY
# )

# text_splitter = RecursiveCharacterTextSplitter(chunk_size=10000, chunk_overlap=1000)
# retriever = None
# qa_chain = None
# vector_store = None

# # ─────────────── PDF UPLOAD & PROCESS ──────────────────────

# @app.post("/upload_pdf/")
# async def upload_pdf(file: UploadFile = File(...)):
#     global retriever, qa_chain, vector_store

#     with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
#         tmp_file.write(await file.read())
#         tmp_path = tmp_file.name

#     loader = PyPDFLoader(tmp_path)
#     pages = loader.load_and_split()
#     context = "\n\n".join(p.page_content for p in pages)
#     texts = text_splitter.split_text(context)

#     # Create vector store for embeddings
#     vector_store = Chroma.from_texts(texts, embedding_model)
#     retriever = vector_store.as_retriever(search_kwargs={"k": 5})

#     # Build prompt
#     template = """Use the following pieces of context to answer the question at the end. 
# If you don't know the answer, just say you don't know. Be concise. Say "thanks for asking!" at the end.
# {context}
# Question: {question}
# Helpful Answer:"""
#     prompt = PromptTemplate.from_template(template)

#     qa_chain = RetrievalQA.from_chain_type(
#         model,
#         retriever=retriever,
#         return_source_documents=True,
#         chain_type_kwargs={"prompt": prompt}
#     )

#     # Save knowledge base to MongoDB
#     knowledge_id = str(uuid4())
#     chunks = []
#     for i, chunk in enumerate(texts):
#         chunks.append({
#             "chunkID": f"{knowledge_id}_chunk_{i}",
#             "text": chunk,
#             "metadata": {
#                 "page": pages[i].metadata.get("page", None) if i < len(pages) else None
#             }
#         })

#     knowledge_doc = {
#         "knowledgeID": knowledge_id,
#         "uploadedBy": "anonymous",  # Replace with actual user ID if you have one
#         "fileName": file.filename,
#         "title": file.filename.replace(".pdf", "").title(),
#         "sourceType": "pdf",
#         "cleanedContent": context,
#         "chunks": chunks,
#         "uploadedAt": datetime.utcnow()
#     }

#     await knowledge_base_collection.insert_one(knowledge_doc)

#     return {"message": "PDF uploaded, processed, and saved to MongoDB."}
# # ─────────────── ASK QUESTION ──────────────────────────────

# @app.post("/ask/")
# async def ask_question(question: str = Form(...)):
#     global qa_chain
#     if not qa_chain:
#         return {"error": "No knowledge base found. Upload a PDF first."}

#     result = qa_chain({"query": question})
#     return {"answer": result["result"]}

# # ─────────────── DEFAULT VOICE ROUTE + ERROR ───────────────

# app.include_router(default_voices_router, prefix="/api/default-voices")
# app.include_router(update_profile_router, prefix="/api/update-profile")

# @app.exception_handler(Exception)
# async def global_exception_handler(request: Request, exc: Exception):
#     return JSONResponse(status_code=500, content={"detail": str(exc)})
