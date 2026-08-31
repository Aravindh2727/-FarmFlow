from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.core import database
from app.core.deps import get_current_user
from app.schemas.crop import CropCreate, CropUpdate, CropResponse, CropInDB
from app.schemas.user import PyObjectId
from bson import ObjectId
from datetime import datetime, timezone
from app.routes.fields import check_field_ownership

router = APIRouter()

def get_utc_now():
    return datetime.now(timezone.utc)

async def check_crop_ownership(crop_id: str, user_id: str):
    if not ObjectId.is_valid(crop_id):
        raise HTTPException(status_code=400, detail="Invalid crop ID")
    crop = await database.db.crops.find_one({"_id": ObjectId(crop_id)})
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    await check_field_ownership(crop["field_id"], user_id)
    return crop

@router.get("/", response_model=List[CropResponse])
async def list_crops(
    farm_id: Optional[str] = None, 
    field_id: Optional[str] = None, 
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": str(current_user["_id"])}
    
    # If field_id is provided, verify ownership of field
    if field_id:
        await check_field_ownership(field_id, str(current_user["_id"]))
        query["field_id"] = field_id
    elif farm_id:
        # Optional: check farm ownership, then query crops for that farm
        from app.routes.fields import check_farm_ownership
        await check_farm_ownership(farm_id, str(current_user["_id"]))
        query["farm_id"] = farm_id
        
    if status:
        query["status"] = status
        
    crops_cursor = database.db.crops.find(query)
    crops = await crops_cursor.to_list(length=100)
    return crops

@router.post("/", response_model=CropResponse, status_code=status.HTTP_201_CREATED)
async def create_crop(crop_in: CropCreate, current_user: dict = Depends(get_current_user)):
    # The payload has farm_id and field_id inside it now
    await check_field_ownership(crop_in.field_id, str(current_user["_id"]))
    
    # Optional verification: Ensure the field belongs to the farm_id specified
    field = await database.db.fields.find_one({"_id": ObjectId(crop_in.field_id)})
    if field["farm_id"] != crop_in.farm_id:
        raise HTTPException(status_code=400, detail="Field does not belong to the specified farm")
    
    crop_db = CropInDB(
        **crop_in.model_dump(),
        user_id=str(current_user["_id"])
    )
    result = await database.db.crops.insert_one(crop_db.model_dump(by_alias=True))
    created_crop = await database.db.crops.find_one({"_id": result.inserted_id})
    return created_crop

@router.get("/{id}", response_model=CropResponse)
async def get_crop(id: str, current_user: dict = Depends(get_current_user)):
    crop = await check_crop_ownership(id, str(current_user["_id"]))
    return crop

@router.put("/{id}", response_model=CropResponse)
async def update_crop(id: str, crop_update: CropUpdate, current_user: dict = Depends(get_current_user)):
    await check_crop_ownership(id, str(current_user["_id"]))
    
    update_data = {k: v for k, v in crop_update.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = get_utc_now()
        await database.db.crops.update_one(
            {"_id": ObjectId(id)},
            {"$set": update_data}
        )
    
    updated_crop = await database.db.crops.find_one({"_id": ObjectId(id)})
    return updated_crop

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_crop(id: str, current_user: dict = Depends(get_current_user)):
    await check_crop_ownership(id, str(current_user["_id"]))
    
    # Check for financial records
    if await database.db.activities.count_documents({"crop_id": id}) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete crop with existing activities.")
    if await database.db.expenses.count_documents({"crop_id": id}) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete crop with existing expenses.")
    if await database.db.income.count_documents({"crop_id": id}) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete crop with existing income records.")
        
    await database.db.crops.delete_one({"_id": ObjectId(id)})
    return None
