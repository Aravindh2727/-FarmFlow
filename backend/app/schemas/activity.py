from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timezone
from app.schemas.user import PyObjectId
from enum import Enum

def get_utc_now():
    return datetime.now(timezone.utc)

class ActivityType(str, Enum):
    land_preparation = "Land Preparation"
    ploughing = "Ploughing"
    sowing = "Sowing"
    transplanting = "Transplanting"
    fertilizing = "Fertilizing"
    spraying = "Spraying"
    irrigation = "Irrigation"
    weeding = "Weeding"
    pest_control = "Pest Control"
    harvesting = "Harvesting"
    transportation = "Transportation"
    other = "Other"

class ActivityBase(BaseModel):
    farm_id: str
    field_id: Optional[str] = None
    crop_id: Optional[str] = None
    activity_type: ActivityType
    activity_date: datetime
    description: Optional[str] = None
    labour_count: int = Field(default=0, ge=0)
    labour_cost: float = Field(default=0.0, ge=0.0)
    equipment_cost: float = Field(default=0.0, ge=0.0)
    other_cost: float = Field(default=0.0, ge=0.0)

    @field_validator('labour_cost', 'equipment_cost', 'other_cost')
    @classmethod
    def round_cost(cls, v):
        return round(float(v), 2)

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    farm_id: Optional[str] = None
    field_id: Optional[str] = None
    crop_id: Optional[str] = None
    activity_type: Optional[ActivityType] = None
    activity_date: Optional[datetime] = None
    description: Optional[str] = None
    labour_count: Optional[int] = Field(None, ge=0)
    labour_cost: Optional[float] = Field(None, ge=0.0)
    equipment_cost: Optional[float] = Field(None, ge=0.0)
    other_cost: Optional[float] = Field(None, ge=0.0)

    @field_validator('labour_cost', 'equipment_cost', 'other_cost')
    @classmethod
    def round_cost(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class ActivityInDB(ActivityBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    total_cost: float = 0.0
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class ActivityResponse(ActivityBase):
    id: PyObjectId = Field(alias="_id")
    user_id: str
    total_cost: float
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}
