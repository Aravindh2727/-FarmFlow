import asyncio

import httpx

from app.core.database import db
from app.core.security import create_access_token

USER_ID = "ai_runtime_diagnostic"
EMAIL = "ai.runtime.diagnostic@example.com"


async def main():
    for collection in (db.messages, db.conversations, db.farms, db.users):
        await collection.delete_many({"user_id": USER_ID} if collection != db.users else {"_id": USER_ID})
    await db.users.insert_one({"_id": USER_ID, "email": EMAIL, "name": "AI Diagnostic", "role": "farmer"})
    await db.farms.insert_one({"_id": "ai_runtime_farm", "user_id": USER_ID, "name": "Diagnostic Farm", "location": "Chennai", "total_area": 2})
    try:
        token = create_access_token(EMAIL)
        async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", headers={"Authorization": f"Bearer {token}"}, timeout=60) as client:
            created = await client.post("/api/ai/conversations")
            conversation_id = created.json()["id"]
            results = []
            for message in ("What farms do I have?", "What is the weather today?", "How can I improve my crop yield?"):
                response = await client.post("/api/ai/chat", json={"message": message, "conversation_id": conversation_id})
                results.append((message, response.status_code, response.json()["answer"] != "AI service is temporarily unavailable. Please try again shortly."))
            history = await client.get(f"/api/ai/conversations/{conversation_id}")
            conversations = await client.get("/api/ai/conversations")
            deleted = await client.delete(f"/api/ai/conversations/{conversation_id}")
            print("POST conversation:", created.status_code)
            for message, status, generated in results:
                print(f"POST chat ({message}):", status, "generated:", generated)
            print("GET conversation:", history.status_code, "messages:", len(history.json()))
            print("GET conversations:", conversations.status_code)
            print("DELETE conversation:", deleted.status_code)
    finally:
        await db.messages.delete_many({"user_id": USER_ID})
        await db.conversations.delete_many({"user_id": USER_ID})
        await db.farms.delete_many({"user_id": USER_ID})
        await db.users.delete_many({"_id": USER_ID})


if __name__ == "__main__":
    asyncio.run(main())
