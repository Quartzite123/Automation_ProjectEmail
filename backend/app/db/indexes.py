"""
Centralised index definitions for all MongoDB collections.

Call create_indexes(db) once during FastAPI startup (from database.py).
Adding a new collection's indexes here keeps database.py clean and ensures
every index is declared in one place.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
import pymongo


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    """
    Idempotent — safe to call on every startup.
    MongoDB will skip creation if an identical index already exists.
    """

    # ── users ───────────────────────────────────────────────────────────────
    await db["users"].create_index("email", unique=True)

    # ── batches ─────────────────────────────────────────────────────────────
    await db["batches"].create_index("batch_id", unique=True)
    await db["batches"].create_index("created_at")

    # ── email_logs ───────────────────────────────────────────────────────────
    await db["email_logs"].create_index("batch_id")
    await db["email_logs"].create_index("sent_at")

    # ── shipments ────────────────────────────────────────────────────────────
    # Primary unique constraint: one document per LRN.
    await db["shipments"].create_index("lrn", unique=True)

    # Secondary indexes for common query patterns (listing by client, date).
    await db["shipments"].create_index("client_name")
    await db["shipments"].create_index(
        [("client_name", pymongo.ASCENDING), ("updated_at", pymongo.DESCENDING)]
    )
    await db["shipments"].create_index("status")
    await db["shipments"].create_index("updated_at")

    # ── clients ──────────────────────────────────────────────────────────────
    # Unique constraint: one email record per client name (stored uppercase).
    await db["clients"].create_index("client_name", unique=True)

    print("✅ MongoDB indexes verified / created")
