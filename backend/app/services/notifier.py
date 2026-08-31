from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta, UTC
from bson import ObjectId

async def sync_notifications(db: AsyncIOMotorDatabase, user_id: str):
    """
    Syncs notifications for a user based on upcoming crop harvests and vaccinations.
    This avoids cron jobs by syncing dynamically when requested.
    """
    now = datetime.now(UTC)
    five_days_from_now = now + timedelta(days=5)
    
    # 1. Check Crops nearing harvest
    # Crops that are not "Harvested" and whose expected_harvest_date is soon
    async for crop in db.crops.find({
        "farm_id": {"$in": [str(f["_id"]) async for f in db.farms.find({"user_id": user_id})]},
        "status": {"$ne": "Harvested"},
        "expected_harvest_date": {"$exists": True, "$ne": None}
    }):
        try:
            # Parse crop harvest date (ISO format string usually stored in MongoDB from frontend)
            # Assuming ISO format "YYYY-MM-DD" or similar
            harvest_date_str = crop.get("expected_harvest_date", "")
            if harvest_date_str:
                if 'T' in harvest_date_str:
                    harvest_date = datetime.fromisoformat(harvest_date_str.replace("Z", "+00:00"))
                else:
                    harvest_date = datetime.strptime(harvest_date_str.split('T')[0], "%Y-%m-%d").replace(tzinfo=UTC)
                
                # If harvest is within 5 days and in the future
                if now <= harvest_date <= five_days_from_now:
                    days_left = (harvest_date - now).days
                    
                    # Create notification if it doesn't exist
                    existing = await db.notifications.find_one({
                        "user_id": user_id,
                        "reference_type": "crop",
                        "reference_id": str(crop["_id"]),
                        "type": "crop_reminder"
                    })
                    
                    if not existing:
                        await create_notification(
                            db=db,
                            user_id=user_id,
                            type="crop_reminder",
                            title=f"Crop Ready for Harvest Soon",
                            message=f"Your {crop.get('name', 'crop')} is ready for harvest in {days_left} days.",
                            reference_type="crop",
                            reference_id=str(crop["_id"]),
                            priority="high" if days_left <= 2 else "normal"
                        )
        except Exception as e:
            print(f"Error syncing crop notification: {e}")

    # 2. Check Vaccinations nearing due date
    async for vax in db.vaccinations.find({
        "livestock_id": {"$in": [str(l["_id"]) async for l in db.livestock.find({
            "farm_id": {"$in": [str(f["_id"]) async for f in db.farms.find({"user_id": user_id})]}
        })]},
        "status": {"$ne": "Completed"},
        "next_due_date": {"$exists": True, "$ne": None}
    }):
        try:
            due_date_str = vax.get("next_due_date", "")
            if due_date_str:
                if 'T' in due_date_str:
                    due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
                else:
                    due_date = datetime.strptime(due_date_str.split('T')[0], "%Y-%m-%d").replace(tzinfo=UTC)
                
                if now <= due_date <= five_days_from_now:
                    days_left = (due_date - now).days
                    
                    existing = await db.notifications.find_one({
                        "user_id": user_id,
                        "reference_type": "vaccination",
                        "reference_id": str(vax["_id"]),
                        "type": "livestock_alert"
                    })
                    
                    if not existing:
                        # Get livestock info
                        livestock = await db.livestock.find_one({"_id": ObjectId(vax["livestock_id"])})
                        animal_name = livestock.get("tag_number", "animal") if livestock else "animal"
                        
                        await create_notification(
                            db=db,
                            user_id=user_id,
                            type="livestock_alert",
                            title=f"Vaccination Due Soon",
                            message=f"Vaccination ({vax.get('vaccine_name', 'Unknown')}) for {animal_name} is due in {days_left} days.",
                            reference_type="vaccination",
                            reference_id=str(vax["_id"]),
                            priority="high" if days_left <= 2 else "normal"
                        )
        except Exception as e:
            print(f"Error syncing vaccination notification: {e}")

async def create_notification(db: AsyncIOMotorDatabase, user_id: str, type: str, title: str, message: str, reference_type: str = None, reference_id: str = None, priority: str = "normal"):
    """
    Directly creates a notification in the DB.
    """
    notification = {
        "user_id": user_id,
        "type": type,
        "title": title,
        "message": message,
        "reference_type": reference_type,
        "reference_id": reference_id,
        "priority": priority,
        "is_read": False,
        "created_at": datetime.now(UTC)
    }
    
    result = await db.notifications.insert_one(notification)
    notification["_id"] = str(result.inserted_id)
    return notification
