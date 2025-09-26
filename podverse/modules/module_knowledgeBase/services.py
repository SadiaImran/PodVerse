from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA
from langchain.schema import BaseRetriever
from langchain_core.documents import Document
from gradio_client import Client as GradioClient
import base64
import os
import tempfile
from typing import List, Dict, Optional, Tuple
from .config import *
from .prompts import SAFE_PROMPT

# ========= LLM SERVICE =========
class LLMService:
    @staticmethod
    def make_standard_llm(temperature=0.1, max_tokens=512):
        """Standard LLM for document Q&A"""
        return ChatOpenAI(
            openai_api_base=LLM_BASE_URL,
            openai_api_key=TOGETHER_API_KEY,
            model_name=LLM_MODEL,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    @staticmethod
    def make_enhanced_llm(temperature=0.8, max_tokens=600):
        """Enhanced LLM for podcast conversations"""
        return ChatOpenAI(
            openai_api_base=LLM_BASE_URL,
            openai_api_key=TOGETHER_API_KEY,
            model_name=LLM_MODEL,
            temperature=temperature,
            max_tokens=max_tokens,
        )

# ========= EMBEDDINGS SERVICE =========
class EmbeddingsService:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    
    def embed_query(self, query: str):
        return self.embeddings.embed_query(query)
    
    def embed_documents(self, texts: List[str]):
        return self.embeddings.embed_documents(texts)

# ========= TTS SERVICE =========
class TTSService:
    def __init__(self):
        self._client = None
    
    def get_client(self):
        if self._client is None:
            self._client = GradioClient(TTS_GRADIO_URL, hf_token=HF_TOKEN)
        return self._client
    
    def generate_audio(self, text: str, voice: str = "f-us-1", steps: int = 3) -> Optional[str]:
        """Generate TTS audio and return base64 encoded result"""
        try:
            client = self.get_client()
            result_path = client.predict(text, voice, steps, api_name="/synthesize")
            
            with open(result_path, "rb") as audio_file:
                audio_bytes = audio_file.read()
            
            # Cleanup temp file
            try:
                if os.path.exists(result_path):
                    os.remove(result_path)
            except Exception:
                pass
            
            return base64.b64encode(audio_bytes).decode("utf-8")
        except Exception as e:
            print(f"TTS generation failed: {e}")
            return None

# ========= DOCUMENT SERVICE =========
class DocumentService:
    def __init__(self):
        self.embeddings_service = EmbeddingsService()
    
    def check_chunks_exist(self, supabase_client, user_id: str, storage_path: str) -> bool:
        """Check if chunks for a document already exist"""
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
    
    def get_relevant_context(self, supabase_client, user_id: str, query: str, max_docs: int = 4) -> Tuple[str, List[dict]]:
        """Get relevant context for queries"""
        try:
            query_vector = self.embeddings_service.embed_query(query)
            
            # Try semantic search first
            candidate_rows = []
            try:
                rpc_result = supabase_client.rpc(
                    "match_documents_v2",
                    {
                        "query_embedding": query_vector, 
                        "match_count": max_docs, 
                        "metadata_filter": {"user_id": user_id}
                    }
                ).execute()
                candidate_rows = rpc_result.data or []
            except Exception as e:
                print(f"RPC search failed: {e}")
            
            # Fallback to recent documents
            if not candidate_rows:
                try:
                    fallback = (
                        supabase_client.table("documents")
                        .select("content, metadata")
                        .eq("user_id", user_id)
                        .limit(max_docs)
                        .execute()
                    )
                    candidate_rows = fallback.data or []
                except Exception as e:
                    print(f"Fallback search failed: {e}")
            
            # Format context
            context_text = ""
            sources = []
            
            for row in candidate_rows:
                content = row.get("content", "").strip()
                metadata = row.get("metadata", {})
                
                if content:
                    context_text += f"\n\n{content}"
                    sources.append({
                        "title": metadata.get("title"),
                        "file_path": metadata.get("file_path"),
                        "snippet": content[:200] + "..." if len(content) > 200 else content
                    })
            
            return context_text.strip(), sources
        
        except Exception as e:
            print(f"Context retrieval error: {e}")
            return "", []

# ========= QA SERVICE =========
class QAService:
    def __init__(self):
        self.llm_service = LLMService()
    
    def generate_answer(self, context_docs: List[Document], query: str) -> dict:
        """Generate Q&A response using retrieval chain"""
        try:
            llm = self.llm_service.make_standard_llm()
            qa = RetrievalQA.from_chain_type(
                llm=llm,
                retriever=StaticRetriever(context_docs),
                chain_type="stuff",
                chain_type_kwargs={"prompt": SAFE_PROMPT},
                return_source_documents=True,
            )
            
            result = qa.invoke({"query": query})
            answer = self._polish_answer(result.get("result", ""))
            
            sources = [
                {
                    "title": doc.metadata.get("title"),
                    "file_path": doc.metadata.get("file_path"),
                    "page": doc.metadata.get("page"),
                    "snippet": doc.page_content[:300],
                }
                for doc in result.get("source_documents", [])
            ]
            
            return {"answer": answer, "sources": sources}
        
        except Exception as e:
            print(f"QA generation error: {e}")
            return {"answer": "I don't know based on the provided documents.", "sources": []}
    
    def _polish_answer(self, answer: str) -> str:
        """Clean up and format the answer"""
        if not answer:
            return "I don't know based on the provided documents."
        
        a = answer.strip()
        if a and not a[0].isupper():
            a = a[0].upper() + a[1:]
        if not a.endswith((".", "?", "!")):
            a += "."
        return a

# ========= STATIC RETRIEVER =========
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