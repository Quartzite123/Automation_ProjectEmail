"""
MongoDB connection setup using Motor (async driver).

Index creation is delegated to app/db/indexes.py so that all collection
indexes are declared in one place and easy to extend.
"""
import motor.motor_asyncio
from app.config.settings import MONGODB_URL

client: motor.motor_asyncio.AsyncIOMotorClient = None
db = None


async def connect_to_mongo():
    global client, db
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
    db = client["kiirus_automation"]

    # Delegate all index creation to the centralised index module.
    from app.db.indexes import create_indexes
    await create_indexes(db)

    print("✅ Connected to MongoDB")


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")


def get_db():
    return db
