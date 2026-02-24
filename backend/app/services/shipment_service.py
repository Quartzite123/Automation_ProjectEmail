"""
Shipment upsert service.

Maintains a cumulative 'shipments' collection — one document per LRN.

Upsert rules:
  • LRN already exists  → update all fields (except created_at)
  • LRN is new          → insert with created_at = now
  • Status protection   → if stored status is 'Delivered' and incoming status
                          is NOT 'Delivered', keep 'Delivered' (no downgrade)

Performance:
  • Single bulk_write call — handles 10 000+ rows with no per-row queries.
  • Uses aggregation-pipeline updates so status protection is enforced
    atomically inside MongoDB without a client-side fetch.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
from pymongo import UpdateOne
from pymongo.errors import BulkWriteError

from app.database import get_db


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _to_str(val) -> Optional[str]:
    """Return stripped string or None for NaN / None / blank."""
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    s = str(val).strip()
    return s if s else None


def _to_datetime(val) -> Optional[datetime]:
    """
    Parse a pandas Timestamp, datetime, or raw string into a UTC-aware datetime.
    Returns None for NaT / NaN / unparseable values.
    """
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    try:
        ts = pd.to_datetime(val, errors="coerce")
        if pd.isna(ts):
            return None
        # Convert to Python datetime; attach UTC if naive.
        dt: datetime = ts.to_pydatetime()
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _to_int(val) -> Optional[int]:
    """Return int or None for NaN / non-numeric values."""
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _normalize_client(order_id_val) -> Optional[str]:
    """
    Extract client name from 'Order id' cell.
    Mirrors normalize_name() in processing_service.py:
    strip whitespace + uppercase.
    """
    if order_id_val is None:
        return None
    if isinstance(order_id_val, float) and math.isnan(order_id_val):
        return None
    return str(order_id_val).strip().upper() or None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def upsert_shipments_from_dataframe(df: pd.DataFrame) -> dict:
    """
    Upsert every row of *df* (the raw master Excel DataFrame) into the
    'shipments' collection.

    Returns a summary dict:
        {
            "inserted": int,
            "updated":  int,
            "skipped":  int,   # rows with empty / missing LRN
        }

    Raises nothing — any bulk-write error is caught, logged, and re-raised
    so the caller can decide whether to abort the request.
    """
    db = get_db()
    collection = db["shipments"]

    now = datetime.now(timezone.utc)

    # Normalise column names: strip surrounding whitespace only (preserve case)
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    operations: list[UpdateOne] = []
    skipped = 0

    for _, row in df.iterrows():
        # ── Extract LRN — skip row if missing ──────────────────────────────
        lrn = _to_str(row.get("LRN"))
        if not lrn:
            skipped += 1
            continue

        # ── Extract fields ──────────────────────────────────────────────────
        client_name    = _normalize_client(row.get("Order id"))
        order_id       = _to_str(row.get("Order id"))   # raw order reference → C/NOR
        manifest_date  = _to_datetime(row.get("Manifest Date"))
        origin         = _to_str(row.get("Origin City"))
        destination    = _to_str(row.get("Destination City"))
        pin_code       = _to_str(row.get("Pin code"))
        consignee_name = _to_str(row.get("Consignee name"))
        invoice_number = _to_str(row.get("Invoice Number"))
        no_of_boxes    = _to_int(row.get("No of boxes"))
        new_status     = _to_str(row.get("Current Status")) or "Unknown"
        delivered_date = _to_datetime(row.get("Delivered Date"))
        expected_date  = _to_datetime(row.get("Expected Date"))
        remarks        = _to_str(row.get("Remarks"))

        # ── Build pipeline update (supports $cond + $ifNull) ───────────────
        # Using an aggregation pipeline lets us read the *existing* document's
        # fields inside the update itself — no separate read query needed.
        #
        # Status protection rule implemented with $cond:
        #   keep "Delivered" if that is the current stored value AND the new
        #   incoming value is something else.
        pipeline = [
            {
                "$set": {
                    "lrn":            lrn,
                    "client_name":    client_name,
                    "order_id":       order_id,
                    "manifest_date":  manifest_date,
                    "origin":         origin,
                    "destination":    destination,
                    "pin_code":       pin_code,
                    "consignee_name": consignee_name,
                    "invoice_number": invoice_number,
                    "no_of_boxes":    no_of_boxes,
                    # ── Status protection ───────────────────────────────────
                    # If the stored status is "Delivered" and the new status
                    # is NOT "Delivered" → keep the old "Delivered" status.
                    "status": {
                        "$cond": {
                            "if": {
                                "$and": [
                                    {"$eq": ["$status", "Delivered"]},
                                    {"$ne": [new_status, "Delivered"]},
                                ]
                            },
                            "then": "$status",   # keep existing Delivered
                            "else": new_status,  # use incoming status
                        }
                    },
                    "delivered_date": delivered_date,
                    "expected_date":  expected_date,
                    "remarks":        remarks,
                    "updated_at":     now,
                    # ── created_at: set only on first insert ────────────────
                    # $ifNull returns the EXISTING value if the document
                    # already has created_at; falls back to `now` on insert.
                    "created_at": {
                        "$ifNull": ["$created_at", now]
                    },
                }
            }
        ]

        operations.append(
            UpdateOne(
                filter={"lrn": lrn},
                update=pipeline,
                upsert=True,
            )
        )

    if not operations:
        print(f"⚠️  Shipment upsert: no valid rows (all {skipped} skipped — empty LRN).")
        return {"inserted": 0, "updated": 0, "skipped": skipped}

    # ── Execute single bulk write ───────────────────────────────────────────
    try:
        result = await collection.bulk_write(operations, ordered=False)
    except BulkWriteError as bwe:
        # Partial writes may still have succeeded; log details and re-raise.
        print(f"❌ Shipment bulk_write error: {bwe.details}")
        raise

    inserted = result.upserted_count
    updated  = result.modified_count

    print(
        f"✅ Shipments upserted — "
        f"Inserted: {inserted} | Updated: {updated} | Skipped (no LRN): {skipped}"
    )

    return {"inserted": inserted, "updated": updated, "skipped": skipped}
