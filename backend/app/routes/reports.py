import csv
from io import StringIO, BytesIO
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from datetime import datetime, UTC
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core import database
from app.core.deps import get_current_user

# ReportLab imports
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

router = APIRouter(prefix="/api/reports", tags=["Reports"])

# ==========================================
# Helpers
# ==========================================
async def check_farm_ownership(db: AsyncIOMotorDatabase, farm_id: str, user_id: str):
    if not ObjectId.is_valid(farm_id):
        raise HTTPException(status_code=400, detail="Invalid farm ID")
    farm = await db.farms.find_one({"_id": ObjectId(farm_id)})
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if farm.get("user_id") != str(user_id):
        raise HTTPException(status_code=403, detail="Not authorized to access this farm")
    return farm

def format_date_str(dt_val):
    if dt_val is None:
        return "N/A"
    if isinstance(dt_val, datetime):
        return dt_val.strftime("%Y-%m-%d")
    return str(dt_val)[:10]

def generate_pdf(title: str, summary_data: list, details_data: list, details_title: str = "Details"):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    elements = []
    
    # Title
    elements.append(Paragraph(title, styles['Title']))
    elements.append(Spacer(1, 20))
    
    # Summary Table
    if summary_data:
        elements.append(Paragraph("SUMMARY", styles['Heading2']))
        elements.append(Spacer(1, 10))
        
        t_summary = Table(summary_data, colWidths=[200, 200])
        t_summary.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.black),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.whitesmoke),
            ('GRID', (0,0), (-1,-1), 1, colors.black)
        ]))
        elements.append(t_summary)
        elements.append(Spacer(1, 30))
        
    # Details Table
    if details_data:
        elements.append(Paragraph(details_title, styles['Heading2']))
        elements.append(Spacer(1, 10))
        
        # Calculate column widths dynamically based on number of columns
        num_cols = len(details_data[0])
        col_width = 500 / num_cols
        
        t_details = Table(details_data, colWidths=[col_width]*num_cols)
        t_details.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.whitesmoke, colors.white])
        ]))
        elements.append(t_details)
        
    doc.build(elements)
    buffer.seek(0)
    return buffer

# ==========================================
# 1. Financial Reports
# ==========================================
async def get_financial_data(db, user_id, start_date, end_date, farm_id=None):
    uid_str = str(user_id)
    match_query = {"user_id": uid_str}
    
    if farm_id:
        await check_farm_ownership(db, farm_id, uid_str)
        match_query["farm_id"] = farm_id
        
    if start_date and end_date:
        match_query["expense_date" if "expense" in match_query else "date"] = {
            "$gte": start_date,
            "$lte": end_date
        }
        
    # Aggregate Expenses
    exp_pipeline = [{"$match": match_query}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    exp_res = await db.expenses.aggregate(exp_pipeline).to_list(1)
    total_expenses = exp_res[0]["total"] if exp_res else 0
    
    # Aggregate Income (re-use match query but change date field)
    inc_query = match_query.copy()
    if start_date and end_date:
        inc_query["income_date"] = {"$gte": start_date, "$lte": end_date}
        if "expense_date" in inc_query: del inc_query["expense_date"]
    if "date" in inc_query: del inc_query["date"]
    
    inc_pipeline = [{"$match": inc_query}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    inc_res = await db.income.aggregate(inc_pipeline).to_list(1)
    total_income = inc_res[0]["total"] if inc_res else 0
    
    # Get all expenses for detail
    expenses = await db.expenses.find(match_query).sort("expense_date", 1).to_list(1000)
    incomes = await db.income.find(inc_query).sort("income_date", 1).to_list(1000)
    
    return total_income, total_expenses, expenses, incomes

@router.get("/financial/preview")
async def financial_preview(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    farm_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    total_inc, total_exp, _, _ = await get_financial_data(database.db, str(current_user["_id"]), start_date, end_date, farm_id)
    return {
        "total_income": total_inc,
        "total_expenses": total_exp,
        "net_profit": total_inc - total_exp
    }

@router.get("/financial/pdf")
async def financial_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    farm_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    total_inc, total_exp, expenses, incomes = await get_financial_data(database.db, str(current_user["_id"]), start_date, end_date, farm_id)
    
    summary_data = [
        ["Metric", "Value (INR)"],
        ["Total Income", f"{total_inc:,.2f}"],
        ["Total Expenses", f"{total_exp:,.2f}"],
        ["Net Profit", f"{(total_inc - total_exp):,.2f}"]
    ]
    
    details_data = [["Type", "Date", "Category/Source", "Amount (INR)"]]
    for i in incomes:
        d_str = format_date_str(i.get("income_date"))
        details_data.append(["Income", d_str, i.get("source", "N/A"), f"{i.get('amount', 0):,.2f}"])
    for e in expenses:
        d_str = format_date_str(e.get("expense_date"))
        details_data.append(["Expense", d_str, e.get("category", "N/A"), f"{e.get('amount', 0):,.2f}"])
        
    buffer = generate_pdf("Financial Report", summary_data, details_data, "Transactions")
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=financial_report.pdf"}
    )

@router.get("/financial/csv")
async def financial_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    farm_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    _, _, expenses, incomes = await get_financial_data(database.db, str(current_user["_id"]), start_date, end_date, farm_id)
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Type", "Date", "Category/Source", "Amount", "Description"])
    
    for i in incomes:
        d_str = format_date_str(i.get("income_date"))
        writer.writerow(["Income", d_str, i.get("source", ""), i.get("amount", 0), i.get("description", "")])
    for e in expenses:
        d_str = format_date_str(e.get("expense_date"))
        writer.writerow(["Expense", d_str, e.get("category", ""), e.get("amount", 0), e.get("description", "")])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=financial_report.csv"}
    )

# ==========================================
# 2. Farm Reports (similar structure)
# ==========================================
@router.get("/farm/{farm_id}/preview")
async def farm_preview(
    farm_id: str,
    current_user: dict = Depends(get_current_user)
):
    farm = await check_farm_ownership(database.db, farm_id, str(current_user["_id"]))
    field_count = await database.db.fields.count_documents({"farm_id": farm_id})
    crop_count = await database.db.crops.count_documents({"farm_id": farm_id, "status": {"$ne": "Harvested"}})
    livestock_count = await database.db.livestock.count_documents({"farm_id": farm_id, "status": "Active"})
    
    return {
        "farm_name": farm.get("name"),
        "total_area": farm.get("total_area"),
        "field_count": field_count,
        "active_crops": crop_count,
        "active_livestock": livestock_count
    }

@router.get("/farm/{farm_id}/pdf")
async def farm_pdf(
    farm_id: str,
    current_user: dict = Depends(get_current_user)
):
    farm = await check_farm_ownership(database.db, farm_id, str(current_user["_id"]))
    fields = await database.db.fields.find({"farm_id": farm_id}).to_list(100)
    
    summary_data = [
        ["Attribute", "Details"],
        ["Farm Name", farm.get("name", "N/A")],
        ["Location", farm.get("location", "N/A")],
        ["Total Area", f"{farm.get('total_area', 0)} {farm.get('area_unit', 'Acres')}"]
    ]
    
    details_data = [["Field Name", "Area", "Soil Type"]]
    for f in fields:
        details_data.append([f.get("name", ""), str(f.get("area", 0)), f.get("soil_type", "")])
        
    buffer = generate_pdf(f"Farm Report - {farm.get('name')}", summary_data, details_data, "Fields Overview")
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=farm_report_{farm_id}.pdf"}
    )
