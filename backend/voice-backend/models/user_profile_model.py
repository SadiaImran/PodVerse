from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    fullName: Optional[str] = Field(None, description="Full name of the user")
    email: EmailStr = Field(..., description="Unique email of the user")
    isVerified: bool = Field(default=False, description="Email verification status")
    otp: Optional[str] = Field(None, description="One-time password for verification")
    provider: str = Field(default="email", description="Signup provider: 'email' or 'google'")
    resetPasswordToken: Optional[str] = Field(None, description="Token to reset password")
    resetPasswordExpires: Optional[datetime] = Field(None, description="Expiration time for reset token")
    profileUrl: str = Field(
        default="https://example.com/default-profile.png",
        description="URL of user's profile image"
    )

