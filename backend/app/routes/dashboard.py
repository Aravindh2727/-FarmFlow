from fastapi import APIRouter, Depends
from typing import Optional
from app.core import database
from app.core.deps import get_current_user
from datetime import datetime
import asyncio
from bson import ObjectId

router = APIRouter()

def get_date_match(start_date: Optional[datetime], end_date: Optional[datetime], date_field: str):
    match = {}
    if start_date or end_date:
        match[date_field] = {}
        if start_date: match[date_field]["$gte"] = start_date
        if end_date: match[date_field]["$lte"] = end_date
    return match

@router.get("/kpis")
async def get_dashboard_kpis(
    farm_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    match_query = {"user_id": user_id}
    if farm_id: match_query["farm_id"] = farm_id

    # Farms count
    farm_query = {"user_id": user_id}
    if farm_id: farm_query["_id"] = ObjectId(farm_id)
    
    # Run counts concurrently
    results = await asyncio.gather(
        database.db.farms.count_documents(farm_query),
        database.db.fields.count_documents(match_query),
        database.db.crops.count_documents({**match_query, "status": {"$nin": ["harvested", "sold", "completed"]}}),
        database.db.livestock.count_documents({**match_query, "status": {"$nin": ["Sold", "Deceased", "Transferred", "Inactive"]}})
    )

    return {
        "total_farms": results[0],
        "total_fields": results[1],
        "active_crops": results[2],
        "total_livestock": results[3]
    }

@router.get("/charts/finance")
async def get_finance_charts(
    farm_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    base_match = {"user_id": user_id}
    if farm_id: base_match["farm_id"] = farm_id
    
    # 1. Income/Expense over time (grouped by month-year)
    # We will aggregate expenses and income separately, then merge in python
    
    def get_time_series_pipe(collection, date_field):
        match = dict(base_match)
        date_match = get_date_match(start_date, end_date, date_field)
        if date_match:
            match.update(date_match)
        
        return [
            {"$match": match},
            {"$group": {
                "_id": {
                    "year": {"$year": f"${date_field}"},
                    "month": {"$month": f"${date_field}"}
                },
                "total": {"$sum": "$amount"}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]
        
    expense_pipe = get_time_series_pipe("expenses", "expense_date")
    income_pipe = get_time_series_pipe("income", "income_date")
    
    # Expense categories pipeline
    cat_match = dict(base_match)
    date_match = get_date_match(start_date, end_date, "expense_date")
    if date_match: cat_match.update(date_match)
    
    cat_pipe = [
        {"$match": cat_match},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}}
    ]

    # Livestock costs (Feed, Medical, Vac) by category
    def ls_cat_pipe(date_field, sum_field, category_name):
        m = dict(base_match)
        d_match = get_date_match(start_date, end_date, date_field)
        if d_match: m.update(d_match)
        return [{"$match": m}, {"$group": {"_id": None, "total": {"$sum": f"${sum_field}"}}}]

    # We also need livestock costs in the time series (Feed, Medical, Vaccinations) -> Expenses, Production -> Income
    def ls_ts_pipe(date_field, sum_field):
        m = dict(base_match)
        d_match = get_date_match(start_date, end_date, date_field)
        if d_match: m.update(d_match)
        return [
            {"$match": m},
            {"$group": {
                "_id": {
                    "year": {"$year": f"${date_field}"},
                    "month": {"$month": f"${date_field}"}
                },
                "total": {"$sum": f"${sum_field}"}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]

    pipes = [
        database.db.expenses.aggregate(expense_pipe).to_list(length=100),
        database.db.income.aggregate(income_pipe).to_list(length=100),
        database.db.expenses.aggregate(cat_pipe).to_list(length=100),
        
        database.db.feed_records.aggregate(ls_ts_pipe("feed_date", "cost")).to_list(length=100),
        database.db.medical_records.aggregate(ls_ts_pipe("treatment_date", "cost")).to_list(length=100),
        database.db.vaccination_records.aggregate(ls_ts_pipe("vaccination_date", "cost")).to_list(length=100),
        database.db.production_records.aggregate(ls_ts_pipe("production_date", "income")).to_list(length=100),
        
        database.db.feed_records.aggregate(ls_cat_pipe("feed_date", "cost", "Feed")).to_list(length=1),
        database.db.medical_records.aggregate(ls_cat_pipe("treatment_date", "cost", "Medical")).to_list(length=1),
        database.db.vaccination_records.aggregate(ls_cat_pipe("vaccination_date", "cost", "Vaccination")).to_list(length=1),
        
        # Livestock purchase cost in TS
        database.db.livestock.aggregate(ls_ts_pipe("purchase_date", "purchase_cost")).to_list(length=100),
        # Livestock purchase cost in categories
        database.db.livestock.aggregate(ls_cat_pipe("purchase_date", "purchase_cost", "Livestock Purchase")).to_list(length=1)
    ]

    results = await asyncio.gather(*pipes)
    
    exp_ts, inc_ts, exp_cats, feed_ts, med_ts, vac_ts, prod_ts, feed_tot, med_tot, vac_tot, purch_ts, purch_tot = results
    
    # Merge time series
    ts_dict = {}
    
    def add_to_ts(data, type_key):
        for item in data:
            key = f"{item['_id']['year']}-{str(item['_id']['month']).zfill(2)}"
            if key not in ts_dict:
                ts_dict[key] = {"date": key, "income": 0, "expenses": 0}
            ts_dict[key][type_key] += item["total"]

    add_to_ts(exp_ts, "expenses")
    add_to_ts(feed_ts, "expenses")
    add_to_ts(med_ts, "expenses")
    add_to_ts(vac_ts, "expenses")
    add_to_ts(purch_ts, "expenses")
    
    add_to_ts(inc_ts, "income")
    add_to_ts(prod_ts, "income")
    
    # Sort ts array by date
    time_series = sorted(list(ts_dict.values()), key=lambda x: x["date"])
    
    # Merge categories
    categories = [{"name": c["_id"], "value": c["total"]} for c in exp_cats]
    
    if feed_tot and feed_tot[0]["total"] > 0:
        categories.append({"name": "Livestock Feed", "value": feed_tot[0]["total"]})
    if med_tot and med_tot[0]["total"] > 0:
        categories.append({"name": "Livestock Medical", "value": med_tot[0]["total"]})
    if vac_tot and vac_tot[0]["total"] > 0:
        categories.append({"name": "Livestock Vaccination", "value": vac_tot[0]["total"]})
    if purch_tot and purch_tot[0]["total"] > 0:
        categories.append({"name": "Livestock Purchase", "value": purch_tot[0]["total"]})
        
    categories.sort(key=lambda x: x["value"], reverse=True)

    return {
        "time_series": time_series,
        "expense_categories": categories
    }

@router.get("/crops")
async def get_crop_analytics(
    farm_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    match_query = {"user_id": user_id}
    if farm_id: match_query["farm_id"] = farm_id

    # Get all crops for status pie chart
    status_pipe = [
        {"$match": match_query},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    
    # Get crop profitability (need to join expenses and income per crop)
    # We will do a manual join for simplicity and efficiency given small numbers, 
    # or use $lookup if we want pure mongo. We'll fetch active/completed crops and their expenses/incomes.
    
    crops = await database.db.crops.find(match_query).to_list(length=1000)
    
    # We need to aggregate expenses and income by crop_id
    exp_pipe = [
        {"$match": match_query},
        {"$group": {"_id": "$crop_id", "total": {"$sum": "$amount"}}}
    ]
    inc_pipe = [
        {"$match": match_query},
        {"$group": {"_id": "$crop_id", "total": {"$sum": "$amount"}}}
    ]
    
    status_counts, exp_totals, inc_totals = await asyncio.gather(
        database.db.crops.aggregate(status_pipe).to_list(length=100),
        database.db.expenses.aggregate(exp_pipe).to_list(length=1000),
        database.db.income.aggregate(inc_pipe).to_list(length=1000)
    )
    
    exp_dict = {str(e["_id"]): e["total"] for e in exp_totals if e["_id"]}
    inc_dict = {str(i["_id"]): i["total"] for i in inc_totals if i["_id"]}
    
    profitability = []
    for c in crops:
        cid = str(c["_id"])
        expenses = exp_dict.get(cid, 0.0)
        income = inc_dict.get(cid, 0.0)
        profitability.append({
            "crop_id": cid,
            "name": c["name"],
            "variety": c.get("variety", ""),
            "status": c["status"],
            "area": c.get("area", 0),
            "area_unit": c.get("area_unit", ""),
            "expenses": expenses,
            "income": income,
            "profit": income - expenses
        })
        
    profitability.sort(key=lambda x: x["profit"], reverse=True)
    
    statuses = [{"name": s["_id"], "value": s["count"]} for s in status_counts]

    return {
        "status_distribution": statuses,
        "profitability": profitability
    }

@router.get("/livestock")
async def get_livestock_analytics(
    farm_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    match_query = {"user_id": user_id}
    if farm_id: match_query["farm_id"] = farm_id
    
    # Livestock by type
    type_pipe = [
        {"$match": {**match_query, "status": {"$nin": ["Sold", "Deceased", "Transferred", "Inactive"]}}},
        {"$group": {"_id": "$animal_type", "count": {"$sum": 1}}}
    ]
    
    # Upcoming vaccinations
    today = datetime.utcnow()
    vac_match = {
        "user_id": user_id,
        "next_due_date": {"$gte": today.replace(hour=0, minute=0, second=0, microsecond=0)}
    }
    if farm_id: vac_match["farm_id"] = farm_id
    
    type_counts, upcoming_vacs = await asyncio.gather(
        database.db.livestock.aggregate(type_pipe).to_list(length=100),
        database.db.vaccination_records.aggregate([
            {"$match": vac_match},
            {"$sort": {"next_due_date": 1}},
            {"$limit": 10},
            {"$lookup": {
                "from": "livestock",
                "localField": "livestock_id",
                "foreignField": "_id",
                "as": "animal"
            }},
            {"$unwind": "$animal"}
        ]).to_list(length=10)
    )
    
    types = [{"name": t["_id"], "value": t["count"]} for t in type_counts]
    
    vaccinations = []
    for v in upcoming_vacs:
        vaccinations.append({
            "_id": str(v["_id"]),
            "vaccine_name": v["vaccine_name"],
            "next_due_date": v["next_due_date"].isoformat(),
            "animal_id": v["animal"]["animal_id"],
            "animal_type": v["animal"]["animal_type"]
        })

    return {
        "types_distribution": types,
        "upcoming_vaccinations": vaccinations
    }

@router.get("/recent-activity")
async def get_recent_activity(
    farm_id: Optional[str] = None,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    match_query = {"user_id": user_id}
    if farm_id: match_query["farm_id"] = farm_id

    # We will fetch latest N from expenses, income, activities, production and sort them in Python
    # This is efficient enough for small limits.
    
    async def fetch_latest(collection, date_field, type_label, extra_fields):
        pipe = [
            {"$match": match_query},
            {"$sort": {date_field: -1}},
            {"$limit": limit},
            {"$project": {"_id": 1, "date": f"${date_field}", "type": {"$literal": type_label}, **extra_fields}}
        ]
        return await database.db[collection].aggregate(pipe).to_list(length=limit)

    results = await asyncio.gather(
        fetch_latest("expenses", "expense_date", "Expense", {"amount": 1, "category": 1}),
        fetch_latest("income", "income_date", "Income", {"amount": 1, "source": 1}),
        fetch_latest("activities", "activity_date", "Activity", {"activity_type": 1, "total_cost": 1}),
        fetch_latest("production_records", "production_date", "Livestock Production", {"production_type": 1, "income": 1, "quantity": 1})
    )
    
    all_activities = []
    for r in results:
        all_activities.extend(r)
        
    all_activities.sort(key=lambda x: x["date"], reverse=True)
    
    # Format the output slightly
    formatted = []
    for a in all_activities[:limit]:
        title = ""
        amount = 0
        is_income = False
        
        if a["type"] == "Expense":
            title = f"Expense: {a.get('category', 'General')}"
            amount = a.get("amount", 0)
        elif a["type"] == "Income":
            title = f"Income: {a.get('source', 'General')}"
            amount = a.get("amount", 0)
            is_income = True
        elif a["type"] == "Activity":
            title = f"Activity: {a.get('activity_type', 'General')}"
            amount = a.get("total_cost", 0)
        elif a["type"] == "Livestock Production":
            title = f"Production: {a.get('production_type', 'General')} ({a.get('quantity', 0)})"
            amount = a.get("income", 0)
            is_income = True
            
        formatted.append({
            "id": str(a["_id"]),
            "date": a["date"].isoformat() if a.get("date") else None,
            "type": a["type"],
            "title": title,
            "amount": amount,
            "is_income": is_income
        })
        
    return formatted
