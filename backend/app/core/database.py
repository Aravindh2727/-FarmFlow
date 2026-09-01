from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client = None
_db = None

def get_db():
    global client, _db
    if _db is None:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        try:
            _db = client.get_default_database(default=settings.DATABASE_NAME)
        except Exception:
            _db = client[settings.DATABASE_NAME]
    return _db

class DatabaseProxy:
    def __getattr__(self, name):
        return getattr(get_db(), name)

    def __getitem__(self, name):
        return get_db()[name]

# Singleton proxy instance
db = DatabaseProxy()

async def connect_to_mongo():
    get_db()
    print(f"Connected to MongoDB database: {settings.DATABASE_NAME}")

async def close_mongo_connection():
    global client, _db
    if client:
        client.close()
        _db = None
        print("Closed MongoDB connection")
