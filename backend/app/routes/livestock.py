from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.core import database
from app.core.deps import get_current_user
from app.schemas.livestock import (
    LivestockCreate, LivestockUpdate, LivestockResponse, LivestockInDB,
    FeedRecordCreate, FeedRecordUpdate, FeedRecordResponse, FeedRecordInDB,
    MedicalRecordCreate, MedicalRecordUpdate, MedicalRecordResponse, MedicalRecordInDB,
    VaccinationRecordCreate, VaccinationRecordUpdate, VaccinationRecordResponse, VaccinationRecordInDB,
    ProductionRecordCreate, ProductionRecordUpdate, ProductionRecordResponse, ProductionRecordInDB
)
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter()

def get_utc_now():
    return datetime.now(timezone.utc)

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

async def check_farm_ownership(farm_id: str, user_id: str):
    if not ObjectId.is_valid(farm_id):
        raise HTTPException(status_code=400, detail="Invalid farm ID")
    farm = await database.db.farms.find_one({"_id": ObjectId(farm_id)})
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if farm.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this farm")
    return farm

async def check_livestock_ownership(livestock_id: str, user_id: str):
    if not ObjectId.is_valid(livestock_id):
        raise HTTPException(status_code=400, detail="Invalid livestock ID")
    livestock = await database.db.livestock.find_one({"_id": ObjectId(livestock_id)})
    if not livestock:
        raise HTTPException(status_code=404, detail="Livestock not found")
    if livestock.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this livestock")
    return livestock

async def check_record_ownership(collection_name: str, record_id: str, user_id: str):
    if not ObjectId.is_valid(record_id):
        raise HTTPException(status_code=400, detail="Invalid record ID")
    collection = database.db[collection_name]
    record = await collection.find_one({"_id": ObjectId(record_id)})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if record.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this record")
    return record

async def generate_animal_id(user_id: str, farm_id: str, animal_type: str) -> str:
    # Prefix from first 3 letters of type (e.g. COW, GOA, SHE)
    prefix = animal_type[:3].upper()
    
    # Atomic sequence or count. For simplicity we'll just count and increment.
    count = await database.db.livestock.count_documents({
        "user_id": user_id, 
        "farm_id": farm_id, 
        "animal_type": animal_type
    })
    
    # To prevent race conditions if multiple animals are added simultaneously, 
    # we could check if it exists and increment.
    seq = count + 1
    max_attempts = 10
    for _ in range(max_attempts):
        new_id = f"{prefix}-{str(seq).zfill(3)}"
        existing = await database.db.livestock.find_one({
            "user_id": user_id,
            "farm_id": farm_id,
            "animal_id": new_id
        })
        if not existing:
            return new_id
        seq += 1
        
    return f"{prefix}-{str(seq).zfill(5)}"

# =============================================================================
# LIVESTOCK
# =============================================================================

@router.post("/", response_model=LivestockResponse, status_code=status.HTTP_201_CREATED)
async def create_livestock(livestock_in: LivestockCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await check_farm_ownership(livestock_in.farm_id, user_id)
    
    # Auto-generate animal_id
    animal_id = await generate_animal_id(user_id, livestock_in.farm_id, livestock_in.animal_type.value)
    
    livestock_db = LivestockInDB(
        **livestock_in.model_dump(),
        user_id=user_id,
        animal_id=animal_id
    )
    result = await database.db.livestock.insert_one(livestock_db.model_dump(by_alias=True))
    return await database.db.livestock.find_one({"_id": result.inserted_id})

@router.get("/", response_model=List[LivestockResponse])
async def list_livestock(
    farm_id: Optional[str] = None,
    animal_type: Optional[str] = None,
    breed: Optional[str] = None,
    gender: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": str(current_user["_id"])}
    if farm_id: query["farm_id"] = farm_id
    if animal_type: query["animal_type"] = animal_type
    if breed: query["breed"] = {"$regex": breed, "$options": "i"}
    if gender: query["gender"] = gender
    if status: query["status"] = status
    
    cursor = database.db.livestock.find(query).sort("created_at", -1)
    return await cursor.to_list(length=100)

@router.get("/{id}", response_model=LivestockResponse)
async def get_livestock(id: str, current_user: dict = Depends(get_current_user)):
    return await check_livestock_ownership(id, str(current_user["_id"]))

@router.put("/{id}", response_model=LivestockResponse)
async def update_livestock(id: str, livestock_update: LivestockUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    existing = await check_livestock_ownership(id, user_id)
    
    update_data = {k: v for k, v in livestock_update.model_dump().items() if v is not None}
    
    if "farm_id" in update_data:
        await check_farm_ownership(update_data["farm_id"], user_id)
        
    if update_data:
        update_data["updated_at"] = get_utc_now()
        await database.db.livestock.update_one({"_id": ObjectId(id)}, {"$set": update_data})
        
    return await database.db.livestock.find_one({"_id": ObjectId(id)})

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_livestock(id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await check_livestock_ownership(id, user_id)
    
    # Safe Delete: Check if any child records exist
    has_feed = await database.db.feed_records.find_one({"livestock_id": id})
    has_medical = await database.db.medical_records.find_one({"livestock_id": id})
    has_vac = await database.db.vaccination_records.find_one({"livestock_id": id})
    has_prod = await database.db.production_records.find_one({"livestock_id": id})
    
    if has_feed or has_medical or has_vac or has_prod:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete livestock with existing historical records. Update status to Deceased or Sold instead."
        )
        
    await database.db.livestock.delete_one({"_id": ObjectId(id)})
    return None

# =============================================================================
# FEED RECORDS
# =============================================================================

@router.post("/{livestock_id}/feed", response_model=FeedRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_feed(livestock_id: str, feed_in: FeedRecordCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    livestock = await check_livestock_ownership(livestock_id, user_id)
    
    if feed_in.livestock_id != livestock_id:
        raise HTTPException(status_code=400, detail="URL livestock ID does not match body")
    if feed_in.farm_id != livestock["farm_id"]:
        raise HTTPException(status_code=400, detail="Farm ID does not match livestock's farm")
        
    db_obj = FeedRecordInDB(**feed_in.model_dump(), user_id=user_id)
    res = await database.db.feed_records.insert_one(db_obj.model_dump(by_alias=True))
    return await database.db.feed_records.find_one({"_id": res.inserted_id})

@router.get("/{livestock_id}/feed", response_model=List[FeedRecordResponse])
async def list_feed(livestock_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await check_livestock_ownership(livestock_id, user_id)
    cursor = database.db.feed_records.find({"livestock_id": livestock_id}).sort("feed_date", -1)
    return await cursor.to_list(length=100)

@router.put("/feed/{id}", response_model=FeedRecordResponse)
async def update_feed(id: str, record_update: FeedRecordUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await check_record_ownership("feed_records", id, user_id)
    
    update_data = {k: v for k, v in record_update.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = get_utc_now()
        await database.db.feed_records.update_one({"_id": ObjectId(id)}, {"$set": update_data})
        
    return await database.db.feed_records.find_one({"_id": ObjectId(id)})

@router.delete("/feed/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feed(id: str, current_user: dict = Depends(get_current_user)):
    await check_record_ownership("feed_records", id, str(current_user["_id"]))
    await database.db.feed_records.delete_one({"_id": ObjectId(id)})
    return None

# =============================================================================
# MEDICAL RECORDS
# =============================================================================

@router.post("/{livestock_id}/medical", response_model=MedicalRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_medical(livestock_id: str, record_in: MedicalRecordCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    livestock = await check_livestock_ownership(livestock_id, user_id)
    
    if record_in.livestock_id != livestock_id:
        raise HTTPException(status_code=400, detail="URL livestock ID does not match body")
    if record_in.farm_id != livestock["farm_id"]:
        raise HTTPException(status_code=400, detail="Farm ID does not match livestock's farm")
        
    db_obj = MedicalRecordInDB(**record_in.model_dump(), user_id=user_id)
    res = await database.db.medical_records.insert_one(db_obj.model_dump(by_alias=True))
    return await database.db.medical_records.find_one({"_id": res.inserted_id})

@router.get("/{livestock_id}/medical", response_model=List[MedicalRecordResponse])
async def list_medical(livestock_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await check_livestock_ownership(livestock_id, user_id)
    cursor = database.db.medical_records.find({"livestock_id": livestock_id}).sort("treatment_date", -1)
    return await cursor.to_list(length=100)

@router.put("/medical/{id}", response_model=MedicalRecordResponse)
async def update_medical(id: str, record_update: MedicalRecordUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await check_record_ownership("medical_records", id, user_id)
    
    update_data = {k: v for k, v in record_update.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = get_utc_now()
        await database.db.medical_records.update_one({"_id": ObjectId(id)}, {"$set": update_data})
        
    return await database.db.medical_records.find_one({"_id": ObjectId(id)})

@router.delete("/medical/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medical(id: str, current_user: dict = Depends(get_current_user)):
    await check_record_ownership("medical_records", id, str(current_user["_id"]))
    await database.db.medical_records.delete_one({"_id": ObjectId(id)})
    return None

# =============================================================================
# VACCINATION RECORDS
# =============================================================================

@router.post("/{livestock_id}/vaccinations", response_model=VaccinationRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_vaccination(livestock_id: str, record_in: VaccinationRecordCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    livestock = await check_livestock_ownership(livestock_id, user_id)
    
    if record_in.livestock_id != livestock_id:
        raise HTTPException(status_code=400, detail="URL livestock ID does not match body")
    if record_in.farm_id != livestock["farm_id"]:
        raise HTTPException(status_code=400, detail="Farm ID does not match livestock's farm")
        
    if record_in.next_due_date and record_in.vaccination_date and record_in.next_due_date < record_in.vaccination_date:
        raise HTTPException(status_code=400, detail="Next due date must be on or after vaccination date.")
        
    db_obj = VaccinationRecordInDB(**record_in.model_dump(), user_id=user_id)
    res = await database.db.vaccination_records.insert_one(db_obj.model_dump(by_alias=True))
    return await database.db.vaccination_records.find_one({"_id": res.inserted_id})

@router.get("/{livestock_id}/vaccinations", response_model=List[VaccinationRecordResponse])
async def list_vaccinations(livestock_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await check_livestock_ownership(livestock_id, user_id)
    cursor = database.db.vaccination_records.find({"livestock_id": livestock_id}).sort("vaccination_date", -1)
    return await cursor.to_list(length=100)

@router.put("/vaccinations/{id}", response_model=VaccinationRecordResponse)
async def update_vaccination(id: str, record_update: VaccinationRecordUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    existing = await check_record_ownership("vaccination_records", id, user_id)
    
    update_data = {k: v for k, v in record_update.model_dump().items() if v is not None}
    
    # Validate dates if updated
    v_date = update_data.get("vaccination_date", existing.get("vaccination_date"))
    due_date = update_data.get("next_due_date", existing.get("next_due_date"))
    if v_date and due_date and due_date < v_date:
        raise HTTPException(status_code=400, detail="Next due date must be on or after vaccination date.")

    if update_data:
        update_data["updated_at"] = get_utc_now()
        await database.db.vaccination_records.update_one({"_id": ObjectId(id)}, {"$set": update_data})
        
    return await database.db.vaccination_records.find_one({"_id": ObjectId(id)})

@router.delete("/vaccinations/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vaccination(id: str, current_user: dict = Depends(get_current_user)):
    await check_record_ownership("vaccination_records", id, str(current_user["_id"]))
    await database.db.vaccination_records.delete_one({"_id": ObjectId(id)})
    return None

@router.get("/vaccinations/upcoming", response_model=List[VaccinationRecordResponse])
async def upcoming_vaccinations(current_user: dict = Depends(get_current_user)):
    # Used globally to fetch upcoming vaccinations for the user across all livestock
    user_id = str(current_user["_id"])
    now = get_utc_now()
    cursor = database.db.vaccination_records.find({
        "user_id": user_id,
        "next_due_date": {"$gte": now}
    }).sort("next_due_date", 1)
    return await cursor.to_list(length=100)

# =============================================================================
# PRODUCTION RECORDS
# =============================================================================

@router.post("/{livestock_id}/production", response_model=ProductionRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_production(livestock_id: str, record_in: ProductionRecordCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    livestock = await check_livestock_ownership(livestock_id, user_id)
    
    if record_in.livestock_id != livestock_id:
        raise HTTPException(status_code=400, detail="URL livestock ID does not match body")
    if record_in.farm_id != livestock["farm_id"]:
        raise HTTPException(status_code=400, detail="Farm ID does not match livestock's farm")
        
    rec_dict = record_in.model_dump()
    
    # Calculate income if quantity and selling_price are provided
    if record_in.quantity is not None and record_in.selling_price is not None:
        rec_dict["income"] = round(record_in.quantity * record_in.selling_price, 2)
        
    db_obj = ProductionRecordInDB(**rec_dict, user_id=user_id)
    res = await database.db.production_records.insert_one(db_obj.model_dump(by_alias=True))
    return await database.db.production_records.find_one({"_id": res.inserted_id})

@router.get("/{livestock_id}/production", response_model=List[ProductionRecordResponse])
async def list_production(livestock_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await check_livestock_ownership(livestock_id, user_id)
    cursor = database.db.production_records.find({"livestock_id": livestock_id}).sort("production_date", -1)
    return await cursor.to_list(length=100)

@router.put("/production/{id}", response_model=ProductionRecordResponse)
async def update_production(id: str, record_update: ProductionRecordUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    existing = await check_record_ownership("production_records", id, user_id)
    
    update_data = {k: v for k, v in record_update.model_dump().items() if v is not None}
    
    # Recalculate income if quantity or selling_price changed
    if "quantity" in update_data or "selling_price" in update_data:
        qty = update_data.get("quantity", existing.get("quantity", 0))
        price = update_data.get("selling_price", existing.get("selling_price", 0))
        if qty is not None and price is not None:
            update_data["income"] = round(float(qty) * float(price), 2)
            
    if update_data:
        update_data["updated_at"] = get_utc_now()
        await database.db.production_records.update_one({"_id": ObjectId(id)}, {"$set": update_data})
        
    return await database.db.production_records.find_one({"_id": ObjectId(id)})

@router.delete("/production/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_production(id: str, current_user: dict = Depends(get_current_user)):
    await check_record_ownership("production_records", id, str(current_user["_id"]))
    await database.db.production_records.delete_one({"_id": ObjectId(id)})
    return None
