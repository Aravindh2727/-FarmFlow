from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timezone
from app.schemas.user import PyObjectId
from enum import Enum

def get_utc_now():
    return datetime.now(timezone.utc)

class ExpenseCategory(str, Enum):
    seeds = "Seeds"
    fertilizer = "Fertilizer"
    pesticide = "Pesticide"
    labour = "Labour"
    tractor = "Tractor"
    machinery = "Machinery"
    irrigation = "Irrigation"
    electricity = "Electricity"
    fuel = "Fuel"
    transport = "Transport"
    equipment = "Equipment"
    land_preparation = "Land Preparation"
    other = "Other"

class PaymentMethod(str, Enum):
    cash = "Cash"
    upi = "UPI"
    bank_transfer = "Bank Transfer"
    card = "Card"
    other = "Other"

class ExpenseBase(BaseModel):
    farm_id: str
    field_id: Optional[str] = None
    crop_id: Optional[str] = None
    activity_id: Optional[str] = None
    amount: float = Field(..., ge=0.0)
    category: ExpenseCategory
    expense_date: datetime
    description: Optional[str] = None
    payment_method: PaymentMethod = PaymentMethod.cash
    vendor: Optional[str] = None
    receipt_reference: Optional[str] = None

    @field_validator('amount')
    @classmethod
    def round_amount(cls, v):
        return round(float(v), 2)

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    farm_id: Optional[str] = None
    field_id: Optional[str] = None
    crop_id: Optional[str] = None
    activity_id: Optional[str] = None
    amount: Optional[float] = Field(None, ge=0.0)
    category: Optional[ExpenseCategory] = None
    expense_date: Optional[datetime] = None
    description: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    vendor: Optional[str] = None
    receipt_reference: Optional[str] = None

    @field_validator('amount')
    @classmethod
    def round_amount(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class ExpenseInDB(ExpenseBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class ExpenseResponse(ExpenseBase):
    id: PyObjectId = Field(alias="_id")
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}
