from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from app.schemas.user import PyObjectId

def get_utc_now():
    return datetime.now(timezone.utc)

class FarmBase(BaseModel):
    name: str
    location: str
    total_area: float = Field(..., gt=0)
    area_unit: str
    description: Optional[str] = None

class FarmCreate(FarmBase):
    pass

class FarmUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    total_area: Optional[float] = Field(None, gt=0)
    area_unit: Optional[str] = None
    description: Optional[str] = None

class FarmInDB(FarmBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class FarmResponse(FarmBase):
    id: PyObjectId = Field(alias="_id")
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}
