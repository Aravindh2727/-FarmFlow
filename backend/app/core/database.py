from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client = None
db = None

async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    try:
        db = client.get_default_database(default=settings.DATABASE_NAME)
    except Exception:
        db = client[settings.DATABASE_NAME]
    print(f"Connected to MongoDB database: {db.name}")

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")

