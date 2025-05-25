from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class GoogleLoginRequest(BaseModel):
    id_token: str

class SendOTPRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    client_url: str

class ResetPasswordRequest(BaseModel):
    new_password: str

class TokenResponse(BaseModel):
    token: str
    msg: str = "Login successful"

class MessageResponse(BaseModel):
    msg: str 