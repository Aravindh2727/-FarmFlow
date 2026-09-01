import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "farmflow")

async def clean_demo_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"Connecting to MongoDB at {MONGO_URL}, database: {DB_NAME}...")
    
    demo_email = "demo@farmflow.com"
    demo_user = await db.users.find_one({"email": demo_email})
    
    if not demo_user:
        print("No demo user found in database.")
        return
        
    user_id = str(demo_user["_id"])
    print(f"Found demo user (ID: {user_id}). Removing all associated demo records...")
    
    # Find all farms for this demo user
    farms = await db.farms.find({"user_id": user_id}).to_list(1000)
    farm_ids = [str(f["_id"]) for f in farms]
    
    # 1. Delete fields & crops
    del_fields = await db.fields.delete_many({"$or": [{"farm_id": {"$in": farm_ids}}, {"user_id": user_id}]})
    del_crops = await db.crops.delete_many({"$or": [{"farm_id": {"$in": farm_ids}}, {"user_id": user_id}]})
    
    # 2. Delete livestock and sub-records
    livestock = await db.livestock.find({"$or": [{"farm_id": {"$in": farm_ids}}, {"user_id": user_id}]}).to_list(1000)
    ls_ids = [str(ls["_id"]) for ls in livestock]
    
    del_ls = await db.livestock.delete_many({"$or": [{"farm_id": {"$in": farm_ids}}, {"user_id": user_id}]})
    del_feed = await db.feed_records.delete_many({"$or": [{"livestock_id": {"$in": ls_ids}}, {"user_id": user_id}]})
    del_med = await db.medical_records.delete_many({"$or": [{"livestock_id": {"$in": ls_ids}}, {"user_id": user_id}]})
    del_vax = await db.vaccinations.delete_many({"$or": [{"livestock_id": {"$in": ls_ids}}, {"user_id": user_id}]})
    del_prod = await db.production_records.delete_many({"$or": [{"livestock_id": {"$in": ls_ids}}, {"user_id": user_id}]})
    
    # 3. Delete finances
    del_exp = await db.expenses.delete_many({"$or": [{"farm_id": {"$in": farm_ids}}, {"user_id": user_id}]})
    del_inc = await db.income.delete_many({"$or": [{"farm_id": {"$in": farm_ids}}, {"user_id": user_id}]})
    del_incs = await db.incomes.delete_many({"$or": [{"farm_id": {"$in": farm_ids}}, {"user_id": user_id}]})
    
    # 4. Delete activities & notifications
    del_act = await db.activities.delete_many({"$or": [{"farm_id": {"$in": farm_ids}}, {"user_id": user_id}]})
    del_notif = await db.notifications.delete_many({"user_id": user_id})
    
    # 5. Delete farms & demo user
    del_farms = await db.farms.delete_many({"user_id": user_id})
    del_user = await db.users.delete_one({"_id": demo_user["_id"]})
    
    print("\n--- Cleanup Summary ---")
    print(f"Farms deleted: {del_farms.deleted_count}")
    print(f"Fields deleted: {del_fields.deleted_count}")
    print(f"Crops deleted: {del_crops.deleted_count}")
    print(f"Livestock deleted: {del_ls.deleted_count}")
    print(f"Expenses deleted: {del_exp.deleted_count}")
    print(f"Income deleted: {del_inc.deleted_count + del_incs.deleted_count}")
    print(f"Activities deleted: {del_act.deleted_count}")
    print(f"Notifications deleted: {del_notif.deleted_count}")
    print(f"Demo User deleted: {del_user.deleted_count}")
    print("Successfully removed all demo details!")

if __name__ == "__main__":
    asyncio.run(clean_demo_data())
