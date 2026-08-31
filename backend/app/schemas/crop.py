from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime, timezone
from app.schemas.user import PyObjectId
from enum import Enum

def get_utc_now():
    return datetime.now(timezone.utc)

class CropStatus(str, Enum):
    planned = "planned"
    planted = "planted"
    growing = "growing"
    ready_for_harvest = "ready_for_harvest"
    harvested = "harvested"
    sold = "sold"
    completed = "completed"

class CropBase(BaseModel):
    name: str
    crop_type: Optional[str] = None
    variety: Optional[str] = None
    farm_id: str
    field_id: str
    area: Optional[float] = Field(None, gt=0)
    area_unit: Optional[str] = None
    status: str = "planned"
    expected_yield: Optional[float] = None
    yield_unit: Optional[str] = None
    actual_yield: Optional[float] = None
    actual_yield_unit: Optional[str] = None
    notes: Optional[str] = None

class CropCreate(CropBase):
    planting_date: Optional[datetime] = None
    expected_harvest_date: Optional[datetime] = None
    actual_harvest_date: Optional[datetime] = None

    @model_validator(mode='after')
    def check_dates(self):
        if self.planting_date:
            if self.expected_harvest_date and self.expected_harvest_date < self.planting_date:
                raise ValueError('expected_harvest_date cannot be earlier than planting_date')
            if self.actual_harvest_date and self.actual_harvest_date < self.planting_date:
                raise ValueError('actual_harvest_date cannot be earlier than planting_date')
        return self

class CropUpdate(BaseModel):
    name: Optional[str] = None
    variety: Optional[str] = None
    area: Optional[float] = Field(None, gt=0)
    area_unit: Optional[str] = None
    status: Optional[str] = None
    planting_date: Optional[datetime] = None
    expected_harvest_date: Optional[datetime] = None
    actual_harvest_date: Optional[datetime] = None
    expected_yield: Optional[float] = None
    yield_unit: Optional[str] = None
    actual_yield: Optional[float] = None
    actual_yield_unit: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode='after')
    def check_dates(self):
        if self.planting_date:
            if self.expected_harvest_date and self.expected_harvest_date < self.planting_date:
                raise ValueError('expected_harvest_date cannot be earlier than planting_date')
            if self.actual_harvest_date and self.actual_harvest_date < self.planting_date:
                raise ValueError('actual_harvest_date cannot be earlier than planting_date')
        return self

class CropInDB(CropBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    planting_date: Optional[datetime] = None
    expected_harvest_date: Optional[datetime] = None
    actual_harvest_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class CropResponse(CropBase):
    id: PyObjectId = Field(alias="_id")
    user_id: str
    planting_date: Optional[datetime] = None
    expected_harvest_date: Optional[datetime] = None
    actual_harvest_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}
