from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from app.schemas.user import PyObjectId

def get_utc_now():
    return datetime.now(timezone.utc)

class FieldBase(BaseModel):
    name: str
    area: float = Field(..., gt=0)
    area_unit: Optional[str] = None
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None
    description: Optional[str] = None

class FieldCreate(FieldBase):
    pass

class FieldUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[float] = Field(None, gt=0)
    area_unit: Optional[str] = None
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None
    description: Optional[str] = None

class FieldInDB(FieldBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    farm_id: str
    user_id: str
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class FieldResponse(FieldBase):
    id: PyObjectId = Field(alias="_id")
    farm_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}
