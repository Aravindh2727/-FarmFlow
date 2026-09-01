from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client = None
_db = None

def get_db():
    global client, _db
    if _db is None:
        mongo_url = str(settings.MONGODB_URL).strip().replace("\r", "").replace("\n", "").strip('"\'')
        db_name = str(settings.DATABASE_NAME).strip().replace("\r", "").replace("\n", "").strip('"\'') or "farmflow"
        client = AsyncIOMotorClient(mongo_url)
        try:
            _db = client.get_default_database(default=db_name)
        except Exception:
            _db = client[db_name]
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
