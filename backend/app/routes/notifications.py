from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.core import database
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.deps import get_current_user
from app.schemas.notification import NotificationResponse
from app.services.notifier import sync_notifications
from bson import ObjectId

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

def format_notification(notif: dict) -> dict:
    notif["_id"] = str(notif["_id"])
    return notif

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    skip: int = 0, 
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    
    # Sync first to ensure any new notifications are created
    await sync_notifications(database.db, user_id)
    
    cursor = database.db.notifications.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(limit)
    notifications = await cursor.to_list(length=limit)
    
    return [format_notification(n) for n in notifications]

@router.get("/unread-count", response_model=Dict[str, int])
async def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    
    # Optionally sync here too, but maybe avoid it to keep polling extremely lightweight
    # We will sync on the main notification fetch instead
    count = await database.db.notifications.count_documents({"user_id": user_id, "is_read": False})
    
    return {"count": count}

@router.patch("/{id}/read", response_model=NotificationResponse)
async def mark_as_read(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Notification ID")
        
    result = await database.db.notifications.update_one(
        {"_id": ObjectId(id), "user_id": user_id},
        {"$set": {"is_read": True}}
    )
    
    if result.modified_count == 0:
        # Check if exists
        exists = await database.db.notifications.find_one({"_id": ObjectId(id), "user_id": user_id})
        if not exists:
            raise HTTPException(status_code=404, detail="Notification not found")
            
    updated = await database.db.notifications.find_one({"_id": ObjectId(id)})
    return format_notification(updated)

@router.patch("/read-all", response_model=Dict[str, str])
async def mark_all_as_read(
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    
    await database.db.notifications.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {"detail": "All notifications marked as read"}

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Notification ID")
        
    result = await database.db.notifications.delete_one({"_id": ObjectId(id), "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return None
