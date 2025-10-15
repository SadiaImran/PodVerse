from fastapi import APIRouter, Form, HTTPException
from fastapi.params import Depends
from fastapi.responses import JSONResponse
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from typing import List, Optional
from dotenv import load_dotenv
import os
import re
import requests

from connection_supabase_client import (
    get_authenticated_supabase_client,
    get_service_role_client,
    # get_gradio_client
)

router = APIRouter()

# ========= CONFIGURATION =========
load_dotenv()

# Together API Configuration
TOGETHER_API_KEY = os.environ.get("TOGETHER_API_KEY")
TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions"
TOGETHER_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"

os.environ["TOGETHER_API_KEY"] = os.environ.get(
    "TOGETHER_API_KEY", "f98103d1acc08e8528e75028deee01807c69312f742eaddbd877d1b87123dffb"
)

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
# client = None

# Small talk patterns
SMALL_TALK_PATTERNS = {
    r"^\s*(hi|hello|hey|greetings)(?:\s+how\s+are\s+you)?\b": "Hello! 👋 I'm your Podverse assistant. How can I help you today?",
    r"\b(thank(s)?|thank you|appreciate it)\b": "You're welcome! Happy to help! 😊",
    r"\b(bye|goodbye|see ya|see you|later)\b": "Goodbye! Feel free to come back if you have more questions!",
    r"^\s*(how are you|how's it going)\b": "I'm doing great, thank you for asking! How can I assist you with Podverse today?",
    r"\b(help|support|assist)\b": "I'm here to help! You can ask me about Podverse features, recording, editing, or any other questions you have.",
}

# ========= UTILITY FUNCTIONS =========
def detect_small_talk(text: str) -> Optional[str]:
    """Detect and respond to small talk"""
    q = text.lower().strip()
    for pattern, reply in SMALL_TALK_PATTERNS.items():
        if re.search(pattern, q):
            return reply
    return None

# def make_llm_hf(query: str, temperature=0.1, max_tokens=512):
#     """Use Hugging Face LLM for generating responses"""
#     global client
#     if not client:
#         client = get_gradio_client()
#     try:
#         result = client.predict(
#             message=query,
#             api_name="/chat"
#         )
#         return result
#     except Exception as e:
#         print(f"❌ Hugging Face LLM Error: {e}")
#         return "I'm sorry, I couldn't process your request right now."

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

def polish_answer(answer: str) -> str:
    """Clean up and format the answer"""
    if not answer:
        return "I'm sorry, I couldn't find an answer to that question."
    
    a = answer.strip()
    if a and not a[0].isupper():
        a = a[0].upper() + a[1:]
    if not a.endswith((".", "?", "!")):
        a += "."
    return a

# ========= FAQ ROUTES =========

@router.post("/faq/add-question/")
async def add_faq_question(
    question: str = Form(...),
    answer: str = Form(...),
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Add a new FAQ question-answer pair with embeddings.
    Admin-only endpoint for populating FAQ database.
    """
    supabase_authenticated = auth_data["client"]
    
    try:
        # Generate embedding for the question
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        question_vector = embeddings.embed_query(question)
        
        # Insert into faq_data table
        result = supabase_authenticated.table("faq_data").insert({
            "question": question.strip(),
            "answer": answer.strip(),
            "embedding": question_vector
        }).execute()
        
        return {
            "message": "FAQ added successfully!",
            "id": result.data[0]["id"],
            "question": question,
            "answer": answer
        }
        
    except Exception as e:
        print(f"[add-faq] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add FAQ: {str(e)}")


from pydantic import BaseModel

class FAQItem(BaseModel):
    question: str
    answer: str

class BulkFAQRequest(BaseModel):
    faqs: List[FAQItem]

@router.post("/faq/bulk-add/")
async def bulk_add_faq(
    request: BulkFAQRequest,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Bulk add FAQ questions-answer pairs.
    Useful for initial setup or batch imports.
    Expected JSON: {"faqs": [{"question": "...", "answer": "..."}, ...]}
    """
    supabase_authenticated = auth_data["client"]
    
    try:
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        
        rows = []
        for faq in request.faqs:
            question = faq.question.strip()  
            answer = faq.answer.strip()     
            
            if not question or not answer:
                continue
                
            question_vector = embeddings.embed_query(question)
            
            rows.append({
                "question": question,
                "answer": answer,
                "embedding": question_vector
            })
        
        if not rows:
            raise HTTPException(status_code=400, detail="No valid FAQ entries provided")
        
        result = supabase_authenticated.table("faq_data").insert(rows).execute()
        
        return {
            "message": f"Successfully added {len(rows)} FAQ entries!",
            "count": len(rows)
        }
        
    except Exception as e:
        print(f"[bulk-add-faq] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to bulk add FAQs: {str(e)}")


@router.get("/faq/list/")
async def list_faqs(
    limit: int = 50,
    offset: int = 0,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Get a list of all FAQ questions.
    Used for admin management or displaying all FAQs.
    """
    supabase_authenticated = auth_data["client"]
    
    try:
        result = (
            supabase_authenticated.table("faq_data")
            .select("id, question, answer, created_at")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        
        return {
            "faqs": result.data,
            "count": len(result.data)
        }
        
    except Exception as e:
        print(f"[list-faq] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch FAQs: {str(e)}")


@router.post("/faq/query/")
async def query_faq(
    query: str = Form(...),
    use_ai: bool = Form(True),  # Whether to use AI for enhanced responses
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Query the FAQ database with semantic search.
    Returns the most relevant FAQ answers, optionally enhanced by AI.
    AI is ONLY used to rephrase existing answers, never to generate new content.
    """
    try:
        service_client = get_service_role_client()
        q = (query or "").strip()
        
        if not q:
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        print(f"[faq-query] Query: {q}")
        
        # Check for small talk first
        smalltalk = detect_small_talk(q)
        if smalltalk:
            return {
                "answer": smalltalk,
                "source": "small_talk",
                "matched_question": None,
                "confidence": "high"
            }
        
        # Generate embedding for user query
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        query_vector = embeddings.embed_query(q)
        
        # Search for similar FAQs using vector similarity
        try:
            # Try using RPC function for vector search
            rpc_result = service_client.rpc(
                "match_faq_questions",
                {
                    "query_embedding": query_vector,
                    "match_count": 3
                }
            ).execute()
            
            candidate_faqs = rpc_result.data if rpc_result.data else []
            print(f"[faq-query] Found {len(candidate_faqs)} similar FAQs via RPC")
            
        except Exception as rpc_error:
            print(f"[faq-query] RPC search failed: {rpc_error}, trying fallback")
            
            # Fallback: Get all FAQs and compute similarity manually
            try:
                all_faqs = service_client.table("faq_data").select("*").limit(100).execute()
                
                if all_faqs.data:
                    import numpy as np
                    qv = np.array(query_vector)
                    scored = []
                    
                    for faq in all_faqs.data:
                        if faq.get("embedding"):
                            faq_vec = np.array(faq["embedding"])
                            similarity = float(
                                np.dot(qv, faq_vec) / (np.linalg.norm(qv) * np.linalg.norm(faq_vec))
                            )
                            scored.append((similarity, faq))
                    
                    scored.sort(key=lambda x: x[0], reverse=True)
                    candidate_faqs = [{"similarity": score, **faq} for score, faq in scored[:3]]
                    print(f"[faq-query] Found {len(candidate_faqs)} similar FAQs via fallback")
                else:
                    candidate_faqs = []
                    
            except Exception as fallback_error:
                print(f"[faq-query] Fallback also failed: {fallback_error}")
                candidate_faqs = []
        
        # STRICT: No match found - return "no answer" message
        if not candidate_faqs:
            return {
                "answer": "I couldn't find an answer to that question in our knowledge base. Please try rephrasing your question, or contact our support team for assistance.",
                "source": "no_match",
                "matched_question": None,
                "confidence": "none"
            }
        
        # Get the best match
        best_match = candidate_faqs[0]
        similarity_score = best_match.get("similarity", 0)
        
        # STRICT THRESHOLD: Only return answers with good similarity (>0.65)
        if similarity_score < 0.55:
            return {
                "answer": "I couldn't find a relevant answer to that specific question in our knowledge base. Please try asking differently or contact our support team.",
                "source": "low_similarity",
                "matched_question": best_match["question"],
                "confidence": "none",
                "similarity": similarity_score,
                "related_questions": [
                    {"question": faq["question"], "similarity": faq.get("similarity", 0)}
                    for faq in candidate_faqs[:3]
                ]
            }
        
        # High confidence threshold - return exact answer
        if similarity_score > 0.70:
            return {
                "answer": best_match["answer"],
                "source": "faq_exact",
                "matched_question": best_match["question"],
                "confidence": "high",
                "similarity": similarity_score,
                "related_questions": [
                    {"question": faq["question"], "similarity": faq.get("similarity", 0)}
                    for faq in candidate_faqs[1:3]
                ]
            }
        
        # Medium confidence (0.55-0.70) - rephrase the EXISTING answer to match user's question style
        else:
            if use_ai:
                # AI only rephrases the EXISTING answer, doesn't generate new content
                context = f"""You are rephrasing an answer from our FAQ database to better match the user's question style.

FAQ Answer (DO NOT change the meaning or add new information):
{best_match['answer']}

User's Question Style: "{q}"

Rephrase the FAQ answer above to sound more natural and conversational while addressing the user's specific question. 
IMPORTANT: Only rephrase the existing information. Do not add any new information or make assumptions.

Rephrased Answer:"""
                
                ai_response = make_llm_together(context, temperature=0.1, max_tokens=256)
                answer = polish_answer(ai_response)
            else:
                # Without AI, just return the original answer
                answer = best_match["answer"]
            
            return {
                "answer": answer,
                "source": "faq_rephrased" if use_ai else "faq_exact",
                "matched_question": best_match["question"],
                "confidence": "medium",
                "similarity": similarity_score,
                "related_questions": [
                    {"question": faq["question"], "similarity": faq.get("similarity", 0)}
                    for faq in candidate_faqs[1:3]
                ]
            }
        
    except Exception as e:
        print(f"[faq-query] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process query: {str(e)}")


@router.delete("/faq/delete/{faq_id}")
async def delete_faq(
    faq_id: str,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Delete an FAQ entry by ID (admin only)"""
    supabase_authenticated = auth_data["client"]
    
    try:
        result = supabase_authenticated.table("faq_data").delete().eq("id", faq_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="FAQ not found")
        
        return {
            "message": "FAQ deleted successfully",
            "id": faq_id
        }
        
    except Exception as e:
        print(f"[delete-faq] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete FAQ: {str(e)}")


@router.put("/faq/update/{faq_id}")
async def update_faq(
    faq_id: str,
    question: Optional[str] = Form(None),
    answer: Optional[str] = Form(None),
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Update an existing FAQ entry"""
    supabase_authenticated = auth_data["client"]
    
    try:
        update_data = {}
        
        if question:
            # Regenerate embedding if question changed
            embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
            question_vector = embeddings.embed_query(question.strip())
            update_data["question"] = question.strip()
            update_data["embedding"] = question_vector
        
        if answer:
            update_data["answer"] = answer.strip()
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = (
            supabase_authenticated.table("faq_data")
            .update(update_data)
            .eq("id", faq_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="FAQ not found")
        
        return {
            "message": "FAQ updated successfully",
            "id": faq_id,
            "updated_fields": list(update_data.keys())
        }
        
    except Exception as e:
        print(f"[update-faq] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update FAQ: {str(e)}")


@router.get("/faq/search/")
async def search_faq_text(
    search: str,
    limit: int = 10,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Text-based search through FAQ questions and answers.
    Uses simple text matching (not semantic search).
    """
    supabase_authenticated = auth_data["client"]
    
    try:
        # Search in both questions and answers
        result = (
            supabase_authenticated.table("faq_data")
            .select("id, question, answer, created_at")
            .or_(f"question.ilike.%{search}%,answer.ilike.%{search}%")
            .limit(limit)
            .execute()
        )
        
        return {
            "results": result.data,
            "count": len(result.data),
            "search_term": search
        }
        
    except Exception as e:
        print(f"[search-faq] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search FAQs: {str(e)}")