import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/yourdbname")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client.get_database("podverse")
knowledge_base_collection = db["knowledge_base"]