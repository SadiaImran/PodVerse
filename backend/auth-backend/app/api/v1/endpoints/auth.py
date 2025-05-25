from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
import firebase_admin
from firebase_admin import auth, credentials
import secrets
import os

from app.core.config import settings
from app.schemas.auth import (
    LoginRequest, GoogleLoginRequest, SendOTPRequest,
    VerifyOTPRequest, ForgotPasswordRequest, ResetPasswordRequest,
    TokenResponse, MessageResponse
)
from app.utils.email import send_otp_email, send_reset_link_email

router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Initialize Firebase
cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
firebase_admin.initialize_app(cred)

# MongoDB client
client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client.podverse
users = db.users

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Cookie(None)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await users.find_one({"_id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, response: Response):
    user = await users.find_one({"email": request.email.lower().strip()})
    if not user or not user.get("is_verified"):
        raise HTTPException(status_code=400, detail="User not found or not verified")
    
    if not pwd_context.verify(request.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    expires_delta = timedelta(days=settings.REMEMBER_ME_EXPIRE_DAYS) if request.remember_me else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token({"user_id": str(user["_id"])}, expires_delta)
    
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        secure=os.getenv("NODE_ENV") == "production",
        samesite="strict",
        max_age=expires_delta.total_seconds()
    )
    
    return TokenResponse(token=token)

@router.post("/google-login", response_model=TokenResponse)
async def google_login(request: GoogleLoginRequest):
    try:
        decoded_token = auth.verify_id_token(request.id_token)
        email = decoded_token["email"]
        
        user = await users.find_one({"email": email})
        if not user:
            user = {
                "email": email,
                "is_verified": True,
                "provider": "google"
            }
            result = await users.insert_one(user)
            user["_id"] = result.inserted_id
        
        token = create_access_token({"user_id": str(user["_id"])})
        return TokenResponse(token=token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google authentication failed: {str(e)}")

@router.post("/send-otp", response_model=MessageResponse)
async def send_otp(request: SendOTPRequest):
    existing_user = await users.find_one({"email": request.email})
    if existing_user and existing_user.get("is_verified"):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    otp = str(secrets.randbelow(900000) + 100000)
    hashed_password = pwd_context.hash(request.password)
    
    await send_otp_email(request.email, otp)
    
    if existing_user:
        await users.update_one(
            {"email": request.email},
            {"$set": {
                "otp": otp,
                "password": hashed_password,
                "is_verified": False
            }}
        )
    else:
        await users.insert_one({
            "email": request.email,
            "otp": otp,
            "password": hashed_password,
            "is_verified": False,
            "provider": "email"
        })
    
    return MessageResponse(msg="OTP sent successfully")

@router.post("/verify-otp", response_model=MessageResponse)
async def verify_otp(request: VerifyOTPRequest):
    user = await users.find_one({"email": request.email})
    if not user or user.get("otp") != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    await users.update_one(
        {"email": request.email},
        {"$set": {"is_verified": True, "otp": None}}
    )
    
    return MessageResponse(msg="Email verified successfully")

@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: ForgotPasswordRequest):
    user = await users.find_one({"email": request.email})
    if not user or not user.get("is_verified"):
        raise HTTPException(status_code=404, detail="User not found or not verified")
    
    token = secrets.token_hex(32)
    reset_url = f"{request.client_url}/reset-password/{token}"
    
    await users.update_one(
        {"email": request.email},
        {"$set": {
            "reset_password_token": token,
            "reset_password_expires": datetime.utcnow() + timedelta(minutes=30)
        }}
    )
    
    await send_reset_link_email(request.email, reset_url)
    return MessageResponse(msg="Reset link sent to email")

@router.post("/reset-password/{token}", response_model=MessageResponse)
async def reset_password(token: str, request: ResetPasswordRequest):
    user = await users.find_one({
        "reset_password_token": token,
        "reset_password_expires": {"$gt": datetime.utcnow()}
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    hashed_password = pwd_context.hash(request.new_password)
    await users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password": hashed_password,
            "reset_password_token": None,
            "reset_password_expires": None
        }}
    )
    
    return MessageResponse(msg="Password updated successfully")

@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response):
    response.delete_cookie("token")
    return MessageResponse(msg="Logged out successfully") 