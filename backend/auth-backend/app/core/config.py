from typing import List
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl

class Settings(BaseSettings):
    PROJECT_NAME: str = "PodVerse Auth API"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    CORS_ORIGINS: List[AnyHttpUrl] = ["http://localhost:3000"]
    
    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REMEMBER_ME_EXPIRE_DAYS: int = 7
    
    # MongoDB
    MONGODB_URL: str
    
    # Firebase
    FIREBASE_CREDENTIALS_PATH: str = "firebase-service-account.json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings() 