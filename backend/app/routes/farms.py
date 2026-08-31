from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.core import database
from app.core.deps import get_current_user
from app.schemas.farm import FarmCreate, FarmUpdate, FarmResponse, FarmInDB
from app.schemas.user import PyObjectId
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter()

def get_utc_now():
    return datetime.now(timezone.utc)

@router.get("/", response_model=List[FarmResponse])
async def list_farms(current_user: dict = Depends(get_current_user)):
    farms_cursor = database.db.farms.find({"user_id": str(current_user["_id"])})
    farms = await farms_cursor.to_list(length=100)
    return farms

@router.post("/", response_model=FarmResponse, status_code=status.HTTP_201_CREATED)
async def create_farm(farm_in: FarmCreate, current_user: dict = Depends(get_current_user)):
    farm_db = FarmInDB(
        **farm_in.model_dump(),
        user_id=str(current_user["_id"])
    )
    result = await database.db.farms.insert_one(farm_db.model_dump(by_alias=True))
    created_farm = await database.db.farms.find_one({"_id": result.inserted_id})
    return created_farm

@router.get("/{id}", response_model=FarmResponse)
async def get_farm(id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid farm ID")
    farm = await database.db.farms.find_one({"_id": ObjectId(id)})
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if farm["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to access this farm")
    return farm

@router.put("/{id}", response_model=FarmResponse)
async def update_farm(id: str, farm_update: FarmUpdate, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid farm ID")
    
    farm = await database.db.farms.find_one({"_id": ObjectId(id)})
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if farm["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to modify this farm")
    
    update_data = {k: v for k, v in farm_update.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = get_utc_now()
        await database.db.farms.update_one(
            {"_id": ObjectId(id)},
            {"$set": update_data}
        )
    
    updated_farm = await database.db.farms.find_one({"_id": ObjectId(id)})
    return updated_farm

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_farm(id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid farm ID")
    
    farm = await database.db.farms.find_one({"_id": ObjectId(id)})
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if farm["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to delete this farm")
    
    # Check for fields
    fields_count = await database.db.fields.count_documents({"farm_id": id})
    if fields_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete farm with existing fields. Delete fields first.")
        
    # Check for financial records
    if await database.db.activities.count_documents({"farm_id": id}) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete farm with existing activities.")
    if await database.db.expenses.count_documents({"farm_id": id}) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete farm with existing expenses.")
    if await database.db.income.count_documents({"farm_id": id}) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete farm with existing income records.")
    
    # Check for livestock
    if await database.db.livestock.count_documents({"farm_id": id}) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete farm with existing livestock.")
    
    await database.db.farms.delete_one({"_id": ObjectId(id)})
    return None
