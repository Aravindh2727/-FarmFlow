from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.core import database
from app.core.deps import get_current_user
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseInDB
from bson import ObjectId
from datetime import datetime, timezone
from app.routes.activities import validate_relationships
from app.services.notifier import create_notification
from app.ml.predictors import ml_predictor

router = APIRouter()

def get_utc_now():
    return datetime.now(timezone.utc)

async def check_expense_ownership(expense_id: str, user_id: str):
    if not ObjectId.is_valid(expense_id):
        raise HTTPException(status_code=400, detail="Invalid expense ID")
    expense = await database.db.expenses.find_one({"_id": ObjectId(expense_id)})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if expense.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this expense")
    return expense

@router.get("/", response_model=List[ExpenseResponse])
async def list_expenses(
    farm_id: Optional[str] = None,
    field_id: Optional[str] = None,
    crop_id: Optional[str] = None,
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": str(current_user["_id"])}
    
    if farm_id: query["farm_id"] = farm_id
    if field_id: query["field_id"] = field_id
    if crop_id: query["crop_id"] = crop_id
    if category: query["category"] = category
    if payment_method: query["payment_method"] = payment_method
        
    if start_date or end_date:
        query["expense_date"] = {}
        if start_date: query["expense_date"]["$gte"] = start_date
        if end_date: query["expense_date"]["$lte"] = end_date
            
    cursor = database.db.expenses.find(query).sort("expense_date", -1)
    return await cursor.to_list(length=100)

@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(expense_in: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await validate_relationships(expense_in.farm_id, expense_in.field_id, expense_in.crop_id, user_id)
    
    # Optional: validate activity_id if provided
    if expense_in.activity_id:
        from app.routes.activities import check_activity_ownership
        await check_activity_ownership(expense_in.activity_id, user_id)

    expense_db = ExpenseInDB(
        **expense_in.model_dump(),
        user_id=user_id
    )
    
    result = await database.db.expenses.insert_one(expense_db.model_dump(by_alias=True))
    
    # Check for anomaly directly and generate notification
    try:
        # Simple heuristic to get farm area for anomaly check
        farm = await database.db.farms.find_one({"_id": ObjectId(expense_in.farm_id)})
        farm_area = float(farm.get("total_area", 1.0)) if farm else 1.0
        ai_res = ml_predictor.detect_anomaly(
            category=expense_in.category,
            farm_area=farm_area,
            amount=expense_in.amount
        )
        if ai_res.get("is_anomaly"):
            await create_notification(
                db=database.db,
                user_id=user_id,
                type="finance_alert",
                title="Unusual Expense Recorded",
                message=f"An unusually high expense of ₹{expense_in.amount:,.2f} for {expense_in.category} was just recorded.",
                reference_type="expense",
                reference_id=str(result.inserted_id),
                priority="high"
            )
    except Exception as e:
        print(f"Failed to generate anomaly notification: {e}")

    return await database.db.expenses.find_one({"_id": result.inserted_id})

@router.get("/{id}", response_model=ExpenseResponse)
async def get_expense(id: str, current_user: dict = Depends(get_current_user)):
    return await check_expense_ownership(id, str(current_user["_id"]))

@router.put("/{id}", response_model=ExpenseResponse)
async def update_expense(id: str, expense_update: ExpenseUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    existing = await check_expense_ownership(id, user_id)
    
    update_data = expense_update.model_dump(exclude_unset=True)
    
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
        
    if update_data.get("activity_id"):
        from app.routes.activities import check_activity_ownership
        await check_activity_ownership(update_data["activity_id"], user_id)
        
    if update_data:
        update_data["updated_at"] = get_utc_now()
        await database.db.expenses.update_one({"_id": ObjectId(id)}, {"$set": update_data})
        
    return await database.db.expenses.find_one({"_id": ObjectId(id)})

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(id: str, current_user: dict = Depends(get_current_user)):
    await check_expense_ownership(id, str(current_user["_id"]))
    await database.db.expenses.delete_one({"_id": ObjectId(id)})
    return None
