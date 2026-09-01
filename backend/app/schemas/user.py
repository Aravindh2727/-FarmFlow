from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, _=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "farmer" # 'farmer' or 'admin'

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

def get_utc_now():
    return datetime.now(timezone.utc)

class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    hashed_password: Optional[str] = None
    google_id: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserResponse(UserBase):
    id: PyObjectId = Field(alias="_id")
    google_id: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class GoogleAuthRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = ""
    google_id: Optional[str] = None
    photo_url: Optional[str] = None
    mode: Optional[str] = "login" # "login" or "signup"

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
