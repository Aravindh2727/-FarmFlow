from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    conversation_id: str
    intent: str
    sources: List[str] = []

class MessageModel(BaseModel):
    id: str = Field(alias="_id")
    conversation_id: str
    user_id: str
    role: str
    content: str
    created_at: datetime

class ConversationModel(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    title: str
    title_source: Optional[str] = "default"
    created_at: datetime
    updated_at: datetime

class ConversationRenameRequest(BaseModel):
    title: str
    source: Optional[str] = "manual"
