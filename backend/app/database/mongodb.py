"""MongoDB/Beanie initialization and safe legacy-index normalization."""

import logging

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING

from app.core.config import settings
from app.models.complaint import Complaint
from app.models.user import User
from app.models.chat_history import ChatHistory

logger = logging.getLogger(__name__)
_client: AsyncIOMotorClient | None = None


async def _normalize_legacy_schema(database) -> None:
    """Remove only known-invalid legacy artifacts; preserve application data."""
    users = database["users"]
    for name, spec in (await users.index_information()).items():
        if name == "_id_" or spec.get("key") != [("firebase_uid", ASCENDING)]:
            continue
        if name != "uniq_firebase_uid" or not spec.get("unique", False):
            logger.warning("Replacing legacy users index %s", name)
            await users.drop_index(name)

    # Exactly one unique Firebase identity index belongs on users.
    await users.create_index(
        [("firebase_uid", ASCENDING)], unique=True, name="uniq_firebase_uid"
    )
    await users.create_index([("email", ASCENDING)], unique=True, name="uniq_email")

    complaints = database["complaints"]
    for name, spec in (await complaints.index_information()).items():
        if name != "_id_" and spec.get("key") == [("firebase_uid", ASCENDING)]:
            logger.warning("Dropping invalid complaints.firebase_uid index %s", name)
            await complaints.drop_index(name)

    await complaints.create_index([("citizen_id", ASCENDING)], name="idx_complaints_citizen_id")
    await complaints.create_index([("department", ASCENDING)], name="idx_complaints_department")
    await complaints.create_index([("status", ASCENDING)], name="idx_complaints_status")
    await complaints.create_index(
        [("assigned_officer", ASCENDING)], name="idx_complaints_assigned_officer"
    )

    # This collection was created by an earlier root-Document inheritance
    # design. It is safe to remove only when it contains no user data.
    collection_names = await database.list_collection_names()
    if "BaseDocument" in collection_names:
        legacy = database["BaseDocument"]
        if await legacy.count_documents({}, limit=1) == 0:
            await legacy.drop()
            logger.info("Removed empty legacy BaseDocument collection")
        else:
            logger.error(
                "Legacy BaseDocument collection contains data and was not deleted; "
                "review it before manual migration."
            )


async def init_db() -> None:
    """Connect MongoDB and register only concrete Beanie documents."""
    global _client
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    database = _client[settings.DATABASE_NAME]

    await _normalize_legacy_schema(database)
    await init_beanie(database=database, document_models=[User, Complaint, ChatHistory])
    logger.info("MongoDB connected; registered collections: users, complaints, chat_history")


async def close_db() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
