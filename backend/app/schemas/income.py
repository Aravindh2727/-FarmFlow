from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime, timezone
from app.schemas.user import PyObjectId
from enum import Enum

def get_utc_now():
    return datetime.now(timezone.utc)

class IncomeSource(str, Enum):
    crop_sale = "Crop Sale"
    government_support = "Government Support"
    other = "Other"

class IncomeBase(BaseModel):
    farm_id: str
    field_id: Optional[str] = None
    crop_id: Optional[str] = None
    income_date: datetime
    source: IncomeSource
    quantity: Optional[float] = Field(None, ge=0.0)
    unit: Optional[str] = None
    selling_price: Optional[float] = Field(None, ge=0.0)
    amount: float = Field(default=0.0, ge=0.0)
    buyer: Optional[str] = None
    description: Optional[str] = None

    @field_validator('quantity', 'selling_price', 'amount')
    @classmethod
    def round_floats(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v
    
class IncomeCreate(IncomeBase):
    pass

class IncomeUpdate(BaseModel):
    farm_id: Optional[str] = None
    field_id: Optional[str] = None
    crop_id: Optional[str] = None
    income_date: Optional[datetime] = None
    source: Optional[IncomeSource] = None
    quantity: Optional[float] = Field(None, ge=0.0)
    unit: Optional[str] = None
    selling_price: Optional[float] = Field(None, ge=0.0)
    amount: Optional[float] = Field(None, ge=0.0)
    buyer: Optional[str] = None
    description: Optional[str] = None

    @field_validator('quantity', 'selling_price', 'amount')
    @classmethod
    def round_floats(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class IncomeInDB(IncomeBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class IncomeResponse(IncomeBase):
    id: PyObjectId = Field(alias="_id")
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}
