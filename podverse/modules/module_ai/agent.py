from __future__ import annotations
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm
)
from livekit.agents.multimodal import MultimodalAgent
from dotenv import load_dotenv
import os
import sys

# Add path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from module_knowledgeBase.rag import generate_rag_response, get_conversation_state, add_to_conversation
from module_knowledgeBase.llm_config import get_together_ai_config, get_model_name

load_dotenv()

# RAG-enabled prompts
WELCOME_MESSAGE = "Welcome to PodVerse! I'm your AI assistant. I can help you with podcast creation using your uploaded documents."
INSTRUCTIONS = """
You are a helpful AI assistant for podcast creation. 
- Use the provided context from user's documents to answer questions
- Be friendly and creative
- If you don't have relevant information, say so clearly
- Focus on podcast-related topics and content creation
"""

class RAGAgent:
    """Simple RAG agent using Together AI"""
    
    def __init__(self):
        self.user_id = None  # Will be set when user connects
        self.supabase_client = None  # Will be set when available
    
    def set_user_id(self, user_id: str):
        """Set the user ID for document retrieval"""
        self.user_id = user_id
    
    async def get_rag_response(self, query: str):
        """Get response using RAG from user's documents"""
        if not self.user_id or not self.supabase_client:
            return "Please upload some documents first so I can help you with podcast content."
        
        try:
            # Generate RAG response using our modular system
            rag_result = generate_rag_response(
                query,
                self.supabase_client,
                self.user_id,
                persona="guest",
                show_name="PodVerse AI Podcast",
                guest_name="AI Assistant"
            )
            
            return rag_result["answer"]
            
        except Exception as e:
            print(f"RAG error: {e}")
            return "Sorry, I'm having trouble accessing your documents right now."

async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)
    await ctx.wait_for_participant()
    
    # Initialize RAG agent
    rag_agent = RAGAgent()
    
    # Simple Together AI model setup using our config
    together_config = get_together_ai_config()
    model_name = get_model_name("mistral-7b-enhanced")
    
    model = llm.LLM(
        model=model_name,  # Uses Together AI model from our config
        instructions=INSTRUCTIONS,
        temperature=0.8
    )
    
    assistant = MultimodalAgent(model=model)
    assistant.start(ctx.room)
    
    # Simple conversation
    session = model.sessions[0]
    session.conversation.item.create(
        llm.ChatMessage(
            role="assistant",
            content=WELCOME_MESSAGE
        )
    )
    session.response.create()
    
    @session.on("user_speech_committed")
    async def on_user_speech_committed(msg: llm.ChatMessage):
        """Handle user speech with RAG"""
        user_text = msg.content if isinstance(msg.content, str) else str(msg.content)
        
        # For now, use a dummy user_id - in real implementation, get from auth
        rag_agent.set_user_id("default_user")
        
        # Get RAG response (you'll need to pass supabase client here)
        # For now, use simple response
        rag_response = f"Based on your documents: {user_text}"
        
        session.conversation.item.create(
            llm.ChatMessage(
                role="user",
                content=user_text
            )
        )
        
        # Add RAG response
        session.conversation.item.create(
            llm.ChatMessage(
                role="assistant", 
                content=rag_response
            )
        )
        
        session.response.create()
    
if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint)) 