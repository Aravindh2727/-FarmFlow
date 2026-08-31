from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class NotificationCreate(BaseModel):
    user_id: str
    type: str # 'crop_reminder', 'livestock_alert', 'finance_alert', 'system'
    title: str
    message: str
    reference_type: Optional[str] = None # 'crop', 'expense', 'vaccination', etc.
    reference_id: Optional[str] = None
    priority: str = "normal" # 'high', 'normal', 'low'

class NotificationInDB(NotificationCreate):
    id: str = Field(alias="_id")
    is_read: bool = False
    created_at: datetime

class NotificationResponse(NotificationInDB):
    pass
