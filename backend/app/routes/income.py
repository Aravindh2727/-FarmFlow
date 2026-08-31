from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.core import database
from app.core.deps import get_current_user
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse, IncomeInDB
from bson import ObjectId
from datetime import datetime, timezone
from app.routes.activities import validate_relationships

router = APIRouter()

def get_utc_now():
    return datetime.now(timezone.utc)

async def check_income_ownership(income_id: str, user_id: str):
    if not ObjectId.is_valid(income_id):
        raise HTTPException(status_code=400, detail="Invalid income ID")
    income = await database.db.income.find_one({"_id": ObjectId(income_id)})
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
    if income.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this income")
    return income

@router.get("/", response_model=List[IncomeResponse])
async def list_income(
    farm_id: Optional[str] = None,
    field_id: Optional[str] = None,
    crop_id: Optional[str] = None,
    source: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": str(current_user["_id"])}
    
    if farm_id: query["farm_id"] = farm_id
    if field_id: query["field_id"] = field_id
    if crop_id: query["crop_id"] = crop_id
    if source: query["source"] = source
        
    if start_date or end_date:
        query["income_date"] = {}
        if start_date: query["income_date"]["$gte"] = start_date
        if end_date: query["income_date"]["$lte"] = end_date
            
    cursor = database.db.income.find(query).sort("income_date", -1)
    return await cursor.to_list(length=100)

@router.post("/", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
async def create_income(income_in: IncomeCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await validate_relationships(income_in.farm_id, income_in.field_id, income_in.crop_id, user_id)
    
    income_dict = income_in.model_dump()
    
    # Calculate amount if quantity and selling_price are provided
    qty = income_dict.get("quantity")
    price = income_dict.get("selling_price")
    if qty is not None and price is not None:
        income_dict["amount"] = round(float(qty) * float(price), 2)
    else:
        # Fallback to the provided amount
        income_dict["amount"] = round(float(income_dict.get("amount", 0.0)), 2)
        
    income_db = IncomeInDB(
        **income_dict,
        user_id=user_id
    )
    
    result = await database.db.income.insert_one(income_db.model_dump(by_alias=True))
    return await database.db.income.find_one({"_id": result.inserted_id})

@router.get("/{id}", response_model=IncomeResponse)
async def get_income(id: str, current_user: dict = Depends(get_current_user)):
    return await check_income_ownership(id, str(current_user["_id"]))

@router.put("/{id}", response_model=IncomeResponse)
async def update_income(id: str, income_update: IncomeUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    existing = await check_income_ownership(id, user_id)
    
    update_data = income_update.model_dump(exclude_unset=True)
    
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
        
    if "quantity" in update_data or "selling_price" in update_data or "amount" in update_data:
        qty = update_data.get("quantity", existing.get("quantity"))
        price = update_data.get("selling_price", existing.get("selling_price"))
        if qty is not None and price is not None:
            update_data["amount"] = round(float(qty) * float(price), 2)
        elif "amount" in update_data and update_data["amount"] is not None:
            update_data["amount"] = round(float(update_data["amount"]), 2)
            
    if update_data:
        update_data["updated_at"] = get_utc_now()
        await database.db.income.update_one({"_id": ObjectId(id)}, {"$set": update_data})
        
    return await database.db.income.find_one({"_id": ObjectId(id)})

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_income(id: str, current_user: dict = Depends(get_current_user)):
    await check_income_ownership(id, str(current_user["_id"]))
    await database.db.income.delete_one({"_id": ObjectId(id)})
    return None
