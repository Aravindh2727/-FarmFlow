from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.core import database
from app.core.deps import get_current_user
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityResponse, ActivityInDB
from bson import ObjectId
from datetime import datetime, timezone
from app.routes.fields import check_farm_ownership, check_field_ownership
from app.routes.crops import check_crop_ownership

router = APIRouter()

def get_utc_now():
    return datetime.now(timezone.utc)

async def check_activity_ownership(activity_id: str, user_id: str):
    if not ObjectId.is_valid(activity_id):
        raise HTTPException(status_code=400, detail="Invalid activity ID")
    activity = await database.db.activities.find_one({"_id": ObjectId(activity_id)})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this activity")
    return activity

async def validate_relationships(farm_id: str, field_id: Optional[str], crop_id: Optional[str], user_id: str):
    await check_farm_ownership(farm_id, user_id)
    if field_id:
        field = await check_field_ownership(field_id, user_id)
        if field["farm_id"] != farm_id:
            raise HTTPException(status_code=400, detail="Field does not belong to the specified farm")
    if crop_id:
        if not field_id:
            raise HTTPException(status_code=400, detail="field_id is required when crop_id is provided")
        crop = await check_crop_ownership(crop_id, user_id)
        if crop["field_id"] != field_id:
            raise HTTPException(status_code=400, detail="Crop does not belong to the specified field")

@router.get("/", response_model=List[ActivityResponse])
async def list_activities(
    farm_id: Optional[str] = None,
    field_id: Optional[str] = None,
    crop_id: Optional[str] = None,
    activity_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": str(current_user["_id"])}
    
    if farm_id:
        query["farm_id"] = farm_id
    if field_id:
        query["field_id"] = field_id
    if crop_id:
        query["crop_id"] = crop_id
    if activity_type:
        query["activity_type"] = activity_type
        
    if start_date or end_date:
        query["activity_date"] = {}
        if start_date:
            query["activity_date"]["$gte"] = start_date
        if end_date:
            query["activity_date"]["$lte"] = end_date
            
    cursor = database.db.activities.find(query).sort("activity_date", -1)
    return await cursor.to_list(length=100)

@router.post("/", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_activity(activity_in: ActivityCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await validate_relationships(activity_in.farm_id, activity_in.field_id, activity_in.crop_id, user_id)
    
    activity_dict = activity_in.model_dump()
    activity_dict["total_cost"] = round(
        activity_dict.get("labour_cost", 0.0) + 
        activity_dict.get("equipment_cost", 0.0) + 
        activity_dict.get("other_cost", 0.0), 
        2
    )
    
    activity_db = ActivityInDB(
        **activity_dict,
        user_id=user_id
    )
    
    result = await database.db.activities.insert_one(activity_db.model_dump(by_alias=True))
    return await database.db.activities.find_one({"_id": result.inserted_id})

@router.get("/{id}", response_model=ActivityResponse)
async def get_activity(id: str, current_user: dict = Depends(get_current_user)):
    return await check_activity_ownership(id, str(current_user["_id"]))

@router.put("/{id}", response_model=ActivityResponse)
async def update_activity(id: str, activity_update: ActivityUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    existing = await check_activity_ownership(id, user_id)
    
    update_data = activity_update.model_dump(exclude_unset=True)
    
    # Clean up empty strings for optional relationship IDs
    if "field_id" in update_data and not update_data["field_id"]:
        update_data["field_id"] = None
    if "crop_id" in update_data and not update_data["crop_id"]:
        update_data["crop_id"] = None
    
    if any(k in update_data for k in ["farm_id", "field_id", "crop_id"]):
        farm_id = update_data.get("farm_id", existing.get("farm_id"))
        
        # If farm changed and field_id wasn't explicitly supplied, reset field_id and crop_id
        if "farm_id" in update_data and update_data["farm_id"] != existing.get("farm_id"):
            field_id = update_data.get("field_id", None)
            crop_id = update_data.get("crop_id", None)
            update_data["field_id"] = field_id
            update_data["crop_id"] = crop_id
        else:
            field_id = update_data["field_id"] if "field_id" in update_data else existing.get("field_id")
            if field_id is None:
                crop_id = None
                update_data["crop_id"] = None
            else:
                crop_id = update_data["crop_id"] if "crop_id" in update_data else existing.get("crop_id")
                
        await validate_relationships(farm_id, field_id, crop_id, user_id)
        
    if any(k in update_data for k in ["labour_cost", "equipment_cost", "other_cost"]):
        lc = update_data.get("labour_cost", existing.get("labour_cost", 0.0)) or 0.0
        ec = update_data.get("equipment_cost", existing.get("equipment_cost", 0.0)) or 0.0
        oc = update_data.get("other_cost", existing.get("other_cost", 0.0)) or 0.0
        update_data["total_cost"] = round(lc + ec + oc, 2)
        
    if update_data:
        update_data["updated_at"] = get_utc_now()
        await database.db.activities.update_one({"_id": ObjectId(id)}, {"$set": update_data})
        
    return await database.db.activities.find_one({"_id": ObjectId(id)})

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(id: str, current_user: dict = Depends(get_current_user)):
    await check_activity_ownership(id, str(current_user["_id"]))
    await database.db.activities.delete_one({"_id": ObjectId(id)})
    return None
