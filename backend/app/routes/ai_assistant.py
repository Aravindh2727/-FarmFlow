from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.core.deps import get_current_user
from app.core.database import db
from app.schemas.ai_assistant import ChatRequest, ChatResponse, ConversationModel, MessageModel, ConversationRenameRequest
from app.services.ai_assistant import ai_assistant_service
from app.services.rate_limiter import user_rate_limiter
from datetime import datetime, timezone
from bson import ObjectId
import uuid

router = APIRouter()

def get_utc_now():
    return datetime.now(timezone.utc)

@router.get("/health")
async def get_ai_health():
    from app.services.ai_providers.factory import get_ai_provider
    from app.core.config import settings

    provider = get_ai_provider()
    health = await provider.check_health()
    return {
        "provider": settings.AI_PROVIDER,
        "available": health.get("available", False),
        "model": settings.AI_MODEL or settings.GEMINI_MODEL,
        "api_key_configured": bool(settings.AI_API_KEY or settings.GEMINI_API_KEY)
    }

@router.get("/config_status")
async def get_ai_status():
    from app.services.ai_providers.factory import get_ai_provider
    from app.core.config import settings

    provider = get_ai_provider()
    health = await provider.check_health()
    return {
        "AI_PROVIDER": settings.AI_PROVIDER,
        "AI_MODEL": settings.AI_MODEL,
        "AI_API_KEY_configured": bool(settings.AI_API_KEY or settings.GEMINI_API_KEY),
        "available": health.get("available", False),
    }

@router.post("/chat")
async def chat_with_assistant(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    # Free-tier per-user rate limit protection
    allowed, limit_msg = user_rate_limiter.check_rate_limit(user_id)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=limit_msg
        )
    
    conversation_id = req.conversation_id
    history = []
    
    if conversation_id:
        # verify conversation belongs to user
        conv = await db.conversations.find_one({"_id": conversation_id, "user_id": user_id})
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        # get history
        messages = await db.messages.find({"conversation_id": conversation_id}).sort("created_at", 1).to_list(length=20)
        history = [{"role": m["role"], "content": m["content"]} for m in messages]
    else:
        conversation_id = str(ObjectId())
        await db.conversations.insert_one({
            "_id": conversation_id,
            "user_id": user_id,
            "title": req.message[:50] + "..." if len(req.message) > 50 else req.message,
            "title_source": "auto",
            "created_at": get_utc_now(),
            "updated_at": get_utc_now()
        })

    # Save user message
    await db.messages.insert_one({
        "_id": str(ObjectId()),
        "conversation_id": conversation_id,
        "user_id": user_id,
        "role": "user",
        "content": req.message,
        "created_at": get_utc_now()
    })

    # Classify intent
    intent = await ai_assistant_service.classify_intent(req.message)
    
    # Generate response
    ai_response = await ai_assistant_service.generate_response(user_id, req.message, intent, history)
    answer = ai_response["answer"]
    weather = ai_response.get("weather")

    # If weather was fetched, we can prepend a small tag or just return the weather data in sources
    # Actually, returning weather in a structured way might be complex to schema, let's just use answer.
    # The frontend is expecting sources or we can just embed weather into sources.
    sources = []
    if weather:
        sources.append({"type": "weather", "data": weather})

    # Save assistant message
    await db.messages.insert_one({
        "_id": str(ObjectId()),
        "conversation_id": conversation_id,
        "user_id": user_id,
        "role": "assistant",
        "content": answer,
        "created_at": get_utc_now()
    })
    
    await db.conversations.update_one(
        {"_id": conversation_id},
        {"$set": {"updated_at": get_utc_now()}}
    )

    return {
        "answer": answer,
        "conversation_id": conversation_id,
        "intent": intent,
        "sources": sources
    }

@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    conversations = await db.conversations.find({"user_id": user_id}).sort("updated_at", -1).to_list(length=50)
    # converting _id to id happens manually or through pydantic
    return [{"id": str(c["_id"]), "title": c["title"], "title_source": c.get("title_source", "default"), "created_at": c["created_at"], "updated_at": c["updated_at"]} for c in conversations]

@router.get("/conversations/{conversation_id}")
async def get_conversation_messages(conversation_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    conv = await db.conversations.find_one({"_id": conversation_id, "user_id": user_id})
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    
    messages = await db.messages.find({"conversation_id": conversation_id}).sort("created_at", 1).to_list(length=100)
    return [{"id": str(m["_id"]), "role": m["role"], "content": m["content"], "created_at": m["created_at"]} for m in messages]

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    conv = await db.conversations.find_one({"_id": conversation_id, "user_id": user_id})
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    
    await db.messages.delete_many({"conversation_id": conversation_id})
    await db.conversations.delete_one({"_id": conversation_id})
    
    return {"status": "success", "message": "Conversation deleted"}

@router.post("/conversations")
async def create_conversation(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    conversation_id = str(ObjectId())
    new_conv = {
        "_id": conversation_id,
        "user_id": user_id,
        "title": "New Conversation",
        "title_source": "default",
        "created_at": get_utc_now(),
        "updated_at": get_utc_now()
    }
    await db.conversations.insert_one(new_conv)
    return {"id": conversation_id, "title": new_conv["title"], "title_source": new_conv["title_source"]}

@router.patch("/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, payload: ConversationRenameRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    title = payload.title
    if not title or not title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    
    title = title.strip()[:50]
    
    conv = await db.conversations.find_one({"_id": conversation_id, "user_id": user_id})
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        
    source = payload.source or "manual"
    await db.conversations.update_one(
        {"_id": conversation_id},
        {"$set": {"title": title, "title_source": source, "updated_at": get_utc_now()}}
    )
    
    return {"id": conversation_id, "title": title, "title_source": source}

