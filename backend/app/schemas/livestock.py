from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from datetime import datetime, timezone
from app.schemas.user import PyObjectId
from enum import Enum

def get_utc_now():
    return datetime.now(timezone.utc)

class AnimalType(str, Enum):
    cow = "Cow"
    cattle = "Cattle"
    buffalo = "Buffalo"
    goat = "Goat"
    sheep = "Sheep"
    poultry = "Poultry"
    pig = "Pig"
    horse = "Horse"
    other = "Other"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            val_clean = value.strip().lower()
            for member in cls:
                if member.value.lower() == val_clean or member.name.lower() == val_clean:
                    return member
            if val_clean in ["cattle", "cow", "bull", "calf", "heifer", "ox"]:
                return cls.cow
            return cls.other
        return super()._missing_(value)

class Gender(str, Enum):
    male = "Male"
    female = "Female"
    unknown = "Unknown"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            val_clean = value.strip().lower()
            for member in cls:
                if member.value.lower() == val_clean or member.name.lower() == val_clean:
                    return member
            return cls.unknown
        return super()._missing_(value)

class LivestockStatus(str, Enum):
    active = "Active"
    sold = "Sold"
    deceased = "Deceased"
    transferred = "Transferred"
    inactive = "Inactive"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            val_clean = value.strip().lower()
            for member in cls:
                if member.value.lower() == val_clean or member.name.lower() == val_clean:
                    return member
            return cls.active
        return super()._missing_(value)

class FeedType(str, Enum):
    grass = "Grass"
    hay = "Hay"
    silage = "Silage"
    cattle_feed = "Cattle Feed"
    grain = "Grain"
    corn = "Corn"
    bran = "Bran"
    mineral_mix = "Mineral Mix"
    other = "Other"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            val_clean = value.strip().lower()
            for member in cls:
                if member.value.lower() == val_clean or member.name.lower() == val_clean:
                    return member
            return cls.other
        return super()._missing_(value)

class FeedUnit(str, Enum):
    kg = "kg"
    g = "g"
    litre = "litre"
    packet = "packet"
    bag = "bag"
    other = "other"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            val_clean = value.strip().lower()
            for member in cls:
                if member.value.lower() == val_clean or member.name.lower() == val_clean:
                    return member
            return cls.other
        return super()._missing_(value)

# =============================================================================
# LIVESTOCK MODELS
# =============================================================================

class LivestockBase(BaseModel):
    farm_id: str
    animal_type: AnimalType
    breed: Optional[str] = None
    gender: Gender = Gender.unknown
    date_of_birth: Optional[datetime] = None
    purchase_date: Optional[datetime] = None
    purchase_cost: float = Field(default=0.0, ge=0.0)
    source: Optional[str] = None
    status: LivestockStatus = LivestockStatus.active
    notes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def handle_legacy_fields(cls, data):
        if isinstance(data, dict):
            # If birth_date was stored instead of date_of_birth
            if 'date_of_birth' not in data and 'birth_date' in data:
                data['date_of_birth'] = data['birth_date']
            # If purchase_date is None or missing, default to now or birth_date
            if not data.get('purchase_date'):
                data['purchase_date'] = data.get('date_of_birth') or datetime.now(timezone.utc)
        return data

    @field_validator('purchase_cost')
    @classmethod
    def round_floats(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class LivestockCreate(LivestockBase):
    pass

class LivestockUpdate(BaseModel):
    farm_id: Optional[str] = None
    animal_type: Optional[AnimalType] = None
    breed: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[datetime] = None
    purchase_date: Optional[datetime] = None
    purchase_cost: Optional[float] = Field(None, ge=0.0)
    source: Optional[str] = None
    status: Optional[LivestockStatus] = None
    notes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def handle_legacy_fields(cls, data):
        if isinstance(data, dict):
            if 'date_of_birth' not in data and 'birth_date' in data:
                data['date_of_birth'] = data['birth_date']
        return data

    @field_validator('purchase_cost')
    @classmethod
    def round_floats(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class LivestockInDB(LivestockBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    animal_id: str = Field(default="")
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    @model_validator(mode='before')
    @classmethod
    def populate_animal_id(cls, data):
        if isinstance(data, dict):
            if not data.get('animal_id'):
                data['animal_id'] = data.get('tag_number') or str(data.get('_id', 'ANIMAL-001'))
        return data

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class LivestockResponse(LivestockBase):
    id: PyObjectId = Field(alias="_id")
    user_id: str
    animal_id: str = Field(default="")
    created_at: datetime
    updated_at: datetime

    @model_validator(mode='before')
    @classmethod
    def populate_animal_id(cls, data):
        if isinstance(data, dict):
            if not data.get('animal_id'):
                data['animal_id'] = data.get('tag_number') or str(data.get('_id', 'ANIMAL-001'))
        return data

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

# =============================================================================
# FEED RECORD MODELS
# =============================================================================

class FeedRecordBase(BaseModel):
    livestock_id: str
    farm_id: str
    feed_type: FeedType
    quantity: float = Field(..., gt=0.0)
    unit: FeedUnit
    feed_date: datetime
    cost: float = Field(default=0.0, ge=0.0)
    supplier: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('quantity', 'cost')
    @classmethod
    def round_floats(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class FeedRecordCreate(FeedRecordBase):
    pass

class FeedRecordUpdate(BaseModel):
    feed_type: Optional[FeedType] = None
    quantity: Optional[float] = Field(None, gt=0.0)
    unit: Optional[FeedUnit] = None
    feed_date: Optional[datetime] = None
    cost: Optional[float] = Field(None, ge=0.0)
    supplier: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('quantity', 'cost')
    @classmethod
    def round_floats(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class FeedRecordInDB(FeedRecordBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class FeedRecordResponse(FeedRecordBase):
    id: PyObjectId = Field(alias="_id")
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

# =============================================================================
# MEDICAL RECORD MODELS
# =============================================================================

class MedicalRecordBase(BaseModel):
    livestock_id: str
    farm_id: str
    treatment_date: datetime
    problem: str
    diagnosis: Optional[str] = None
    treatment: str
    medicine: Optional[str] = None
    veterinarian: Optional[str] = None
    cost: float = Field(default=0.0, ge=0.0)
    notes: Optional[str] = None

    @field_validator('cost')
    @classmethod
    def round_floats(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class MedicalRecordCreate(MedicalRecordBase):
    pass

class MedicalRecordUpdate(BaseModel):
    treatment_date: Optional[datetime] = None
    problem: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    medicine: Optional[str] = None
    veterinarian: Optional[str] = None
    cost: Optional[float] = Field(None, ge=0.0)
    notes: Optional[str] = None

    @field_validator('cost')
    @classmethod
    def round_floats(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class MedicalRecordInDB(MedicalRecordBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class MedicalRecordResponse(MedicalRecordBase):
    id: PyObjectId = Field(alias="_id")
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

# =============================================================================
# VACCINATION RECORD MODELS
# =============================================================================

class VaccinationRecordBase(BaseModel):
    livestock_id: str
    farm_id: Optional[str] = None
    vaccine_name: str
    vaccination_date: datetime
    next_due_date: Optional[datetime] = None
    administered_by: Optional[str] = None
    cost: float = Field(default=0.0, ge=0.0)
    notes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def handle_legacy_vaccination(cls, data):
        if isinstance(data, dict):
            if 'vaccination_date' not in data and 'date_administered' in data:
                data['vaccination_date'] = data['date_administered']
        return data

    @field_validator('cost')
    @classmethod
    def round_floats(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class VaccinationRecordCreate(VaccinationRecordBase):
    pass

class VaccinationRecordUpdate(BaseModel):
    vaccine_name: Optional[str] = None
    vaccination_date: Optional[datetime] = None
    next_due_date: Optional[datetime] = None
    administered_by: Optional[str] = None
    cost: Optional[float] = Field(None, ge=0.0)
    notes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def handle_legacy_vaccination(cls, data):
        if isinstance(data, dict):
            if 'vaccination_date' not in data and 'date_administered' in data:
                data['vaccination_date'] = data['date_administered']
        return data

    @field_validator('cost')
    @classmethod
    def round_floats(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class VaccinationRecordInDB(VaccinationRecordBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class VaccinationRecordResponse(VaccinationRecordBase):
    id: PyObjectId = Field(alias="_id")
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

# =============================================================================
# PRODUCTION RECORD MODELS
# =============================================================================

class ProductionRecordBase(BaseModel):
    livestock_id: str
    farm_id: str
    production_date: datetime
    production_type: str
    quantity: float = Field(..., gt=0.0)
    unit: str
    quality: Optional[str] = None
    selling_price: Optional[float] = Field(None, ge=0.0)
    income: float = Field(default=0.0, ge=0.0)
    buyer: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('quantity', 'selling_price', 'income')
    @classmethod
    def round_floats(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class ProductionRecordCreate(ProductionRecordBase):
    pass

class ProductionRecordUpdate(BaseModel):
    production_date: Optional[datetime] = None
    production_type: Optional[str] = None
    quantity: Optional[float] = Field(None, gt=0.0)
    unit: Optional[str] = None
    quality: Optional[str] = None
    selling_price: Optional[float] = Field(None, ge=0.0)
    income: Optional[float] = Field(None, ge=0.0)
    buyer: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('quantity', 'selling_price', 'income')
    @classmethod
    def round_floats(cls, v):
        if v is not None:
            return round(float(v), 2)
        return v

class ProductionRecordInDB(ProductionRecordBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class ProductionRecordResponse(ProductionRecordBase):
    id: PyObjectId = Field(alias="_id")
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}
