import os
from dotenv import load_dotenv
from fastapi import HTTPException, Header
from supabase import ClientOptions, create_client, Client
from gradio_client import Client

load_dotenv()  

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
HF_TOKEN_1075 = os.environ.get("HF_TOKEN_1075")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in .env")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("Missing SUPABASE_SERVICE_ROLE_KEY in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def get_authenticated_supabase_client(authorization: str = Header(...)):
    """
    Dependency that returns a Supabase client authenticated with the user's JWT.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token missing.")
    
    jwt_token = authorization.split(" ")[1]

    # Validate the JWT token using the global anonymous client
    user_response = supabase.auth.get_user(jwt_token)
    user = user_response.user
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    # Create an authenticated client with the user's JWT
    options = ClientOptions(headers={'Authorization': f'Bearer {jwt_token}'})
    try:
        supabase_authenticated = create_client(SUPABASE_URL, SUPABASE_KEY, options)
        return {
            "client": supabase_authenticated, 
            "user_id": user.id,
            "user_email": user.email 
        }
    except Exception as e:
        print(f"Failed to create authenticated client: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")


def get_service_role_client() -> Client:
    """Return a Supabase client created with the service role key (server-only)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in env for server inserts.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def get_gradio_client() -> Client:
    """Return a Gradio client created on HUGGING FACE."""
    client = Client(
        "sadiaimran1075/deepseek-ai-DeepSeek-V3.2-Exp",
        hf_token=HF_TOKEN_1075
    )
    return client