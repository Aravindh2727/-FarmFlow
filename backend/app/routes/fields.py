from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.core import database
from app.core.deps import get_current_user
from app.schemas.field import FieldCreate, FieldUpdate, FieldResponse, FieldInDB
from app.schemas.user import PyObjectId
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter()

def get_utc_now():
    return datetime.now(timezone.utc)

async def check_farm_ownership(farm_id: str, user_id: str):
    if not ObjectId.is_valid(farm_id):
        raise HTTPException(status_code=400, detail="Invalid farm ID")
    farm = await database.db.farms.find_one({"_id": ObjectId(farm_id)})
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if farm["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this farm")
    return farm

async def check_field_ownership(field_id: str, user_id: str):
    if not ObjectId.is_valid(field_id):
        raise HTTPException(status_code=400, detail="Invalid field ID")
    field = await database.db.fields.find_one({"_id": ObjectId(field_id)})
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    await check_farm_ownership(field["farm_id"], user_id)
    return field

@router.get("/", response_model=List[FieldResponse])
async def list_fields(farm_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": str(current_user["_id"])}
    if farm_id:
        await check_farm_ownership(farm_id, str(current_user["_id"]))
        query["farm_id"] = farm_id
        
    fields_cursor = database.db.fields.find(query)
    fields = await fields_cursor.to_list(length=100)
    return fields

@router.post("/", response_model=FieldResponse, status_code=status.HTTP_201_CREATED)
async def create_field(field_in: FieldCreate, farm_id: str, current_user: dict = Depends(get_current_user)):
    await check_farm_ownership(farm_id, str(current_user["_id"]))
    
    field_db = FieldInDB(
        **field_in.model_dump(),
        farm_id=farm_id,
        user_id=str(current_user["_id"])
    )
    result = await database.db.fields.insert_one(field_db.model_dump(by_alias=True))
    created_field = await database.db.fields.find_one({"_id": result.inserted_id})
    return created_field

@router.get("/{id}", response_model=FieldResponse)
async def get_field(id: str, current_user: dict = Depends(get_current_user)):
    field = await check_field_ownership(id, str(current_user["_id"]))
    return field

@router.put("/{id}", response_model=FieldResponse)
async def update_field(id: str, field_update: FieldUpdate, current_user: dict = Depends(get_current_user)):
    await check_field_ownership(id, str(current_user["_id"]))
    
    update_data = {k: v for k, v in field_update.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = get_utc_now()
        await database.db.fields.update_one(
            {"_id": ObjectId(id)},
            {"$set": update_data}
        )
    
    updated_field = await database.db.fields.find_one({"_id": ObjectId(id)})
    return updated_field

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field(id: str, current_user: dict = Depends(get_current_user)):
    await check_field_ownership(id, str(current_user["_id"]))
    
    # Check for crops
    crops_count = await database.db.crops.count_documents({"field_id": id})
    if crops_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete field with existing crops. Delete crops first.")
        
    # Check for financial records
    if await database.db.activities.count_documents({"field_id": id}) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete field with existing activities.")
    if await database.db.expenses.count_documents({"field_id": id}) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete field with existing expenses.")
    if await database.db.income.count_documents({"field_id": id}) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete field with existing income records.")
    
    
    await database.db.fields.delete_one({"_id": ObjectId(id)})
    return None
