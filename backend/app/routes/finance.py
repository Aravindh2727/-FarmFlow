from fastapi import APIRouter, Depends
from typing import Optional
from app.core import database
from app.core.deps import get_current_user
from app.schemas.finance import FinancialSummaryResponse
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.get("/summary", response_model=FinancialSummaryResponse)
async def get_financial_summary(
    farm_id: Optional[str] = None,
    field_id: Optional[str] = None,
    crop_id: Optional[str] = None,
    livestock_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user)
):
    match_query = {"user_id": str(current_user["_id"])}
    
    if farm_id: match_query["farm_id"] = farm_id
    if field_id: match_query["field_id"] = field_id
    if crop_id: match_query["crop_id"] = crop_id
    
    # Base match for livestock child records
    ls_match_query = {"user_id": str(current_user["_id"])}
    if farm_id: ls_match_query["farm_id"] = farm_id
    if livestock_id: ls_match_query["livestock_id"] = livestock_id
    # Note: field_id and crop_id don't apply to livestock, so if they are provided, 
    # livestock costs should technically be 0 unless we ignore them. 
    # We will only sum livestock records if field_id and crop_id are NOT provided, 
    # OR if livestock_id is specifically requested.
    include_livestock = not field_id and not crop_id
    
    # We apply the date filters individually for expenses and income since field names differ
    # For expenses it's expense_date, for income it's income_date. 
    # But for a simpler generic match, we can just inject them in the specific pipeline.

    expense_match = dict(match_query)
    if start_date or end_date:
        expense_match["expense_date"] = {}
        if start_date: expense_match["expense_date"]["$gte"] = start_date
        if end_date: expense_match["expense_date"]["$lte"] = end_date

    income_match = dict(match_query)
    if start_date or end_date:
        income_match["income_date"] = {}
        if start_date: income_match["income_date"]["$gte"] = start_date
        if end_date: income_match["income_date"]["$lte"] = end_date
        
    expense_pipeline = [
        {"$match": expense_match},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    
    income_pipeline = [
        {"$match": income_match},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]

    import asyncio
    
    # Base pipelines for phase 4
    expense_cursor = database.db.expenses.aggregate(expense_pipeline)
    income_cursor = database.db.income.aggregate(income_pipeline)
    
    # Only run these if we aren't filtering to a specific livestock, or we ARE filtering to a livestock
    # Actually, if livestock_id is provided, expenses and income (which lack livestock_id) will be empty if we force it,
    # or we should just skip them if livestock_id is present.
    if livestock_id:
        expense_result = []
        income_result = []
    else:
        expense_result, income_result = await asyncio.gather(
            expense_cursor.to_list(length=1),
            income_cursor.to_list(length=1)
        )
        
    total_expenses = expense_result[0]["total"] if expense_result else 0.0
    total_income = income_result[0]["total"] if income_result else 0.0

    # Process livestock aggregations if applicable
    if include_livestock or livestock_id:
        # Livestock purchase cost
        ls_purchase_match = dict(ls_match_query)
        if "livestock_id" in ls_purchase_match:
            ls_purchase_match["_id"] = ObjectId(ls_purchase_match.pop("livestock_id"))
        
        # We don't apply date filters to purchase cost currently for simplicity, 
        # or we could apply them to purchase_date
        if start_date or end_date:
            ls_purchase_match["purchase_date"] = {}
            if start_date: ls_purchase_match["purchase_date"]["$gte"] = start_date
            if end_date: ls_purchase_match["purchase_date"]["$lte"] = end_date

        ls_purch_pipe = [{"$match": ls_purchase_match}, {"$group": {"_id": None, "total": {"$sum": "$purchase_cost"}}}]
        
        # Child records
        def make_pipe(date_field, sum_field):
            m = dict(ls_match_query)
            if start_date or end_date:
                m[date_field] = {}
                if start_date: m[date_field]["$gte"] = start_date
                if end_date: m[date_field]["$lte"] = end_date
            return [{"$match": m}, {"$group": {"_id": None, "total": {"$sum": f"${sum_field}"}}}]

        pipes = [
            database.db.livestock.aggregate(ls_purch_pipe).to_list(length=1),
            database.db.feed_records.aggregate(make_pipe("feed_date", "cost")).to_list(length=1),
            database.db.medical_records.aggregate(make_pipe("treatment_date", "cost")).to_list(length=1),
            database.db.vaccination_records.aggregate(make_pipe("vaccination_date", "cost")).to_list(length=1),
            database.db.production_records.aggregate(make_pipe("production_date", "income")).to_list(length=1)
        ]
        
        res_purch, res_feed, res_med, res_vac, res_prod = await asyncio.gather(*pipes)
        
        ls_expenses = (
            (res_purch[0]["total"] if res_purch else 0.0) +
            (res_feed[0]["total"] if res_feed else 0.0) +
            (res_med[0]["total"] if res_med else 0.0) +
            (res_vac[0]["total"] if res_vac else 0.0)
        )
        ls_income = (res_prod[0]["total"] if res_prod else 0.0)
        
        total_expenses += ls_expenses
        total_income += ls_income

    # Ensure python floats are rounded
    total_income = round(float(total_income), 2)
    total_expenses = round(float(total_expenses), 2)
    net_profit = round(total_income - total_expenses, 2)

    return FinancialSummaryResponse(
        total_income=total_income,
        total_expenses=total_expenses,
        net_profit=net_profit
    )
