from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from langchain_ollama import ChatOllama 
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import CharacterTextSplitter
import motor.motor_asyncio
from datetime import datetime
from bson import ObjectId
import os
import shutil
from dotenv import load_dotenv
import speech_recognition as sr
from gtts import gTTS
from fastapi.responses import FileResponse
import whisper
import pyttsx3
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

app = FastAPI()

whisper_model = whisper.load_model("base")  # or "small" / "tiny" for faster but less accurate

tts_engine = pyttsx3.init()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React app origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Setup
MONGO_URI = os.getenv("MONGO_URI")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client["podverse"]
knowledge_base_collection = db["knowledge_base"]

# Use Motor GridFS bucket for async file storage
fs = motor.motor_asyncio.AsyncIOMotorGridFSBucket(db)

from langchain.prompts import PromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.documents import Document
import re
import subprocess

def convert_to_wav(input_path, output_path):
    command = ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", output_path]
    try:
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        print("FFmpeg error:", e.stderr.decode())
        raise

# Initialize Ollama LLM (replacing Together API)
llm = ChatOllama(
    model="mistral",        # You can use "llama2", "codellama", etc.
    temperature=0.7,
    num_predict=512
)

# Define custom prompt
custom_prompt = PromptTemplate(
    input_variables=["context", "question"],
    template="""
You are a helpful assistant. Use only the information in the context below to answer the user's question.

Tone: Friendly and informative. Use simple, easy-to-understand language suitable for someone new to the topic.

Context:
{context}

Question:
{question}

Answer:
"""
)

@app.post("/upload_pdf/")
async def upload_pdf(user_id: str = Form(...), file: UploadFile = File(...)):
    try:
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        loader = PyPDFLoader(temp_file_path)
        documents = loader.load()

        splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=100)
        docs = splitter.split_documents(documents)

        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        vector_store = FAISS.from_documents(docs, embeddings)

        try:
            with open(temp_file_path, "rb") as f:
                pdf_id = await fs.upload_from_stream(file.filename, f)
        except Exception as gridfs_error:
            with open(temp_file_path, "rb") as f:
                import base64
                pdf_content = base64.b64encode(f.read()).decode('utf-8')
            
            file_doc = {
                "filename": file.filename,
                "content": pdf_content,
                "content_type": "application/pdf",
                "uploaded_at": datetime.utcnow(),
                "user_id": user_id
            }
            file_result = await db["files"].insert_one(file_doc)
            pdf_id = str(file_result.inserted_id)

        for chunk in docs:
            await knowledge_base_collection.insert_one({
                "user_id": user_id,
                "title": file.filename,
                "source_type": "pdf",
                "chunk": chunk.page_content,
                "pdf_file_id": str(pdf_id),
                "uploaded_at": datetime.utcnow()
            })

        os.remove(temp_file_path)
        return JSONResponse(content={"message": "PDF processed and stored successfully", "pdf_id": str(pdf_id)}, status_code=200)

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/query_audio/")
async def query_audio(user_id: str = Form(...), audio: UploadFile = File(...)):
    recognizer = sr.Recognizer()

    audio_path = f"temp_{audio.filename}"
    with open(audio_path, "wb") as f:
        f.write(await audio.read())

    if os.path.getsize(audio_path) == 0:
        return JSONResponse(content={"error": "Uploaded audio file is empty"}, status_code=400)

    converted_path = "converted.wav"

    if not audio.content_type.endswith("wav"):
        convert_to_wav(audio_path, converted_path)
    else:
        shutil.copyfile(audio_path, converted_path)

    try:
        with sr.AudioFile(converted_path) as source:
            audio_data = recognizer.record(source)
            query_text = recognizer.recognize_google(audio_data)
    except sr.UnknownValueError:
        return JSONResponse(content={"error": "Could not understand audio"}, status_code=400)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

    os.remove(audio_path)
    os.remove(converted_path)

    response = await generate_response(user_id=user_id, query=query_text)
    response["query"] = query_text
    return response

@app.post("/respond/")
async def generate_response(user_id: str = Form(...), query: str = Form(...)):
    user_docs_cursor = knowledge_base_collection.find({"user_id": user_id})
    user_docs = await user_docs_cursor.to_list(length=None)

    if not user_docs:
        return JSONResponse(content={"error": "No knowledge base found for user"}, status_code=404)

    docs = [Document(page_content=doc["chunk"], metadata=doc) for doc in user_docs]

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

    def contains_query_keywords(documents: list[Document], query: str, min_hits: int = 1) -> bool:
        query_words = set(re.findall(r'\b\w{4,}\b', query.lower()))
        match_count = 0
        for doc in documents:
            doc_words = set(re.findall(r'\b\w{4,}\b', doc.page_content.lower()))
            matches = query_words & doc_words
            if len(matches) >= min_hits:
                match_count += 1
        return match_count > 0

    result = retrieval_qa.invoke({"query": query})
    answer = result["result"]
    sources = result["source_documents"]

    if not sources or not contains_query_keywords(sources, query):
        return {
            "answer_text": "I'm sorry, I couldn't find information related to your question in the provided document.",
            "sources": [],
            "audio_file_url": None
        }

    source_info = [
        {
            "title": doc.metadata.get("title"),
            "file_id": doc.metadata.get("pdf_file_id"),
            "uploaded_at": doc.metadata.get("uploaded_at")
        }
        for doc in sources
    ]

    tts = gTTS(answer)
    audio_filename = f"response_{user_id}.mp3"
    tts.save(audio_filename)

    return {
        "answer_text": answer,
        "sources": source_info,
        "audio_file_url": f"/audio/{audio_filename}"
    }

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    file_path = filename
    if not os.path.exists(file_path):
        return JSONResponse(content={"error": "Audio file not found"}, status_code=404)
    return FileResponse(file_path, media_type="audio/mpeg", filename=filename)
