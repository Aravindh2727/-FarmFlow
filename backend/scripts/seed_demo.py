import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import os
import random
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "farmflow")

async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Seeding Demo Data for Phase 9...")
    
    # 1. Ensure demo user exists
    demo_email = "demo@farmflow.com"
    existing_user = await db.users.find_one({"email": demo_email})
    if existing_user:
        print(f"Demo user {demo_email} already exists. Cleaning up their old data...")
        user_id = str(existing_user["_id"])
        
        # Cleanup
        farms = await db.farms.find({"user_id": user_id}).to_list(100)
        farm_ids = [str(f["_id"]) for f in farms]
        
        await db.fields.delete_many({"farm_id": {"$in": farm_ids}})
        await db.crops.delete_many({"farm_id": {"$in": farm_ids}})
        await db.livestock.delete_many({"farm_id": {"$in": farm_ids}})
        await db.expenses.delete_many({"user_id": user_id})
        await db.incomes.delete_many({"user_id": user_id})
        await db.notifications.delete_many({"user_id": user_id})
        await db.farms.delete_many({"user_id": user_id})
    else:
        print(f"Creating demo user {demo_email}...")
        user_doc = {
            "email": demo_email,
            "name": "Demo Farmer",
            "hashed_password": pwd_context.hash("demo123"),
            "role": "farmer",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        res = await db.users.insert_one(user_doc)
        user_id = str(res.inserted_id)

    # 2. Create Farms
    now = datetime.now(timezone.utc)
    
    farm1 = await db.farms.insert_one({
        "user_id": user_id, "name": "Green Valley Farm", "location": "North District", 
        "total_area": 50, "area_unit": "Acres", "created_at": now, "updated_at": now
    })
    f1_id = str(farm1.inserted_id)
    
    farm2 = await db.farms.insert_one({
        "user_id": user_id, "name": "Riverside Orchard", "location": "East District", 
        "total_area": 20, "area_unit": "Acres", "created_at": now, "updated_at": now
    })
    f2_id = str(farm2.inserted_id)

    # 3. Create Fields
    field1 = await db.fields.insert_one({
        "user_id": user_id, "farm_id": f1_id, "name": "North Field", "area": 25, "soil_type": "Loam", "created_at": now, "updated_at": now
    })
    field2 = await db.fields.insert_one({
        "user_id": user_id, "farm_id": f1_id, "name": "South Field", "area": 25, "soil_type": "Clay", "created_at": now, "updated_at": now
    })
    
    # 4. Create Crops
    # Harvested crop
    await db.crops.insert_one({
        "user_id": user_id, "farm_id": f1_id, "field_id": str(field1.inserted_id), "name": "Wheat 2025",
        "crop_type": "Wheat", "variety": "Winter", "planting_date": (now - timedelta(days=200)),
        "expected_harvest_date": (now - timedelta(days=60)),
        "actual_harvest_date": (now - timedelta(days=62)),
        "status": "Harvested", "expected_yield": 5000, "actual_yield": 5200, "yield_unit": "kg", "created_at": now, "updated_at": now
    })
    
    # Growing crop nearing harvest (Triggers notification on sync)
    crop2 = await db.crops.insert_one({
        "user_id": user_id, "farm_id": f1_id, "field_id": str(field2.inserted_id), "name": "Summer Tomatoes",
        "crop_type": "Tomato", "variety": "Roma", "planting_date": (now - timedelta(days=80)),
        "expected_harvest_date": (now + timedelta(days=3)),
        "status": "Growing", "expected_yield": 8000, "yield_unit": "kg", "created_at": now, "updated_at": now
    })
    c2_id = str(crop2.inserted_id)

    # 5. Finance
    # Past incomes
    await db.incomes.insert_many([
        {"user_id": user_id, "farm_id": f1_id, "source": "Crop Sales", "amount": 125000, "income_date": (now - timedelta(days=60)), "created_at": now, "updated_at": now},
        {"user_id": user_id, "farm_id": f2_id, "source": "Livestock Sales", "amount": 45000, "income_date": (now - timedelta(days=15)), "created_at": now, "updated_at": now}
    ])
    
    # Recent Expenses
    await db.expenses.insert_many([
        {"user_id": user_id, "farm_id": f1_id, "crop_id": c2_id, "category": "Seeds", "amount": 15000, "payment_method": "Bank Transfer", "expense_date": (now - timedelta(days=80)), "created_at": now, "updated_at": now},
        {"user_id": user_id, "farm_id": f1_id, "crop_id": c2_id, "category": "Fertilizer", "amount": 8500, "payment_method": "Cash", "expense_date": (now - timedelta(days=40)), "created_at": now, "updated_at": now},
        {"user_id": user_id, "farm_id": f1_id, "crop_id": c2_id, "category": "Pesticide", "amount": 4200, "payment_method": "UPI", "expense_date": (now - timedelta(days=20)), "created_at": now, "updated_at": now}
    ])

    # 6. Livestock
    ls1 = await db.livestock.insert_one({
        "user_id": user_id, "farm_id": f1_id, "tag_number": "COW-001", "animal_type": "Cattle", "breed": "Holstein",
        "gender": "Female", "birth_date": (now - timedelta(days=1000)), "purchase_date": (now - timedelta(days=500)),
        "purchase_cost": 45000, "status": "Active", "created_at": now, "updated_at": now
    })
    ls1_id = str(ls1.inserted_id)

    # Upcoming Vaccination
    await db.vaccinations.insert_one({
        "user_id": user_id, "livestock_id": ls1_id, "vaccine_name": "FMD", "date_administered": (now - timedelta(days=180)),
        "next_due_date": (now + timedelta(days=2)), "cost": 500, "administered_by": "Dr. Smith", "status": "Scheduled", "created_at": now, "updated_at": now
    })

    print("Demo Data Seeded successfully!")
    print(f"Login with: {demo_email} / demo123")
    
if __name__ == "__main__":
    asyncio.run(seed())
