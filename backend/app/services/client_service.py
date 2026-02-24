"""
Client email management service.

Maintains the 'clients' collection — one document per client_name (uppercase).
Emails are stored permanently so they only need to be entered once.

Public API
----------
    extract_clients_from_dataframe(df)         → list[str]
    check_missing_client_emails(client_names)  → {"existing": {...}, "missing": [...]}
    save_client_email(client_name, email)      → None
    get_all_clients()                          → list[dict]
    get_email_map_for_clients(client_names)    → dict[str, str]
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
from pymongo import UpdateOne

from app.database import get_db


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalize_client(order_id_val) -> Optional[str]:
    """
    Extract and normalise a client name from an 'Order id' cell value.
    Rules: strip whitespace, uppercase. Returns None for blank / NaN.
    Mirrors the same logic used in processing_service.py and shipment_service.py.
    """
    if order_id_val is None:
        return None
    if isinstance(order_id_val, float) and math.isnan(order_id_val):
        return None
    s = str(order_id_val).strip().upper()
    return s if s else None


# ---------------------------------------------------------------------------
# Public functions
# ---------------------------------------------------------------------------

def extract_clients_from_dataframe(df: pd.DataFrame) -> list[str]:
    """
    Extract unique, normalised client names from the master DataFrame.

    The client name is taken from the 'Order id' column, uppercased.
    Blank / NaN values are skipped.

    Parameters
    ----------
    df : pd.DataFrame
        Raw master Excel data (column names must already be strip-normalised).

    Returns
    -------
    Sorted list of unique uppercase client name strings.
    """
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    if "Order id" not in df.columns:
        return []

    names: set[str] = set()
    for val in df["Order id"]:
        name = _normalize_client(val)
        if name:
            names.add(name)

    return sorted(names)


async def check_missing_client_emails(client_names: list[str]) -> dict:
    """
    Check which of the supplied client names already have an email stored.

    Uses a single $in query — no per-client round-trips.

    Parameters
    ----------
    client_names : list[str]
        Normalised (uppercase) client names to check.

    Returns
    -------
    {
        "existing": {"CLIENT A": "a@example.com", ...},
        "missing":  ["CLIENT B", "CLIENT C", ...]
    }
    """
    if not client_names:
        return {"existing": {}, "missing": []}

    db = get_db()
    cursor = db["clients"].find(
        {"client_name": {"$in": client_names}},
        {"_id": 0, "client_name": 1, "email": 1},
    )
    docs = await cursor.to_list(length=None)

    existing: dict[str, str] = {d["client_name"]: d["email"] for d in docs}
    missing: list[str] = sorted(
        name for name in client_names if name not in existing
    )

    return {"existing": existing, "missing": missing}


async def save_client_email(client_name: str, email: str) -> None:
    """
    Upsert a client email into the 'clients' collection.

    • New client  → inserts with created_at = now.
    • Existing    → updates email + updated_at only.

    Parameters
    ----------
    client_name : str   Will be stored uppercase.
    email       : str   Client contact email.
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    client_name = client_name.strip().upper()

    await db["clients"].update_one(
        {"client_name": client_name},
        {
            "$set": {
                "email":      email.strip(),
                "updated_at": now,
            },
            "$setOnInsert": {
                "created_at": now,
            },
        },
        upsert=True,
    )


async def get_all_clients() -> list[dict]:
    """
    Return all client documents sorted alphabetically by client_name.
    _id is excluded from the result.
    """
    db = get_db()
    cursor = db["clients"].find({}, {"_id": 0}).sort("client_name", 1)
    return await cursor.to_list(length=None)


async def get_email_map_for_clients(client_names: list[str]) -> dict[str, str]:
    """
    Fetch  {client_name: email}  for the given client names from MongoDB.
    Uses a single $in query.

    Only clients that exist in the DB are included in the result.
    """
    if not client_names:
        return {}

    db = get_db()
    cursor = db["clients"].find(
        {"client_name": {"$in": client_names}},
        {"_id": 0, "client_name": 1, "email": 1},
    )
    docs = await cursor.to_list(length=None)
    return {d["client_name"]: d["email"] for d in docs}


async def bulk_save_clients(clients: list[dict]) -> dict:
    """
    Bulk upsert many clients in a single MongoDB bulk_write call.

    Each item in *clients* must have:
        { "client_name": str (uppercase), "email": str }

    Uses ordered=False so partial failures do not abort the batch.

    Returns
    -------
    {
        "message":  "Bulk save complete",
        "inserted": <upserted count>,
        "modified": <modified count>,
        "total":    <input count>
    }
    """
    if not clients:
        return {"message": "Nothing to save", "inserted": 0, "modified": 0, "total": 0}

    now = datetime.now(timezone.utc)
    ops = [
        UpdateOne(
            {"client_name": c["client_name"]},
            {
                "$set": {
                    "email":      c["email"].strip(),
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "created_at": now,
                },
            },
            upsert=True,
        )
        for c in clients
    ]

    db = get_db()
    result = await db["clients"].bulk_write(ops, ordered=False)

    return {
        "message":  "Bulk save complete",
        "inserted": result.upserted_count,
        "modified": result.modified_count,
        "total":    len(clients),
    }


async def delete_client(client_name: str) -> bool:
    """
    Delete a client by exact (already-uppercased) name.

    Returns True if a document was deleted, False if not found.
    """
    db = get_db()
    result = await db["clients"].delete_one({"client_name": client_name})
    return result.deleted_count > 0
