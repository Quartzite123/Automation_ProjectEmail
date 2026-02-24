"""
Client-facing endpoints — client email checking.

Routes
------
POST /api/clients/check
    Read a master Excel file, extract client names, return which ones
    are missing from the 'clients' collection.
    Auth: require_read_access
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import pandas as pd

from app.services.client_service import (
    extract_clients_from_dataframe,
    check_missing_client_emails,
)
from app.auth.dependencies import require_read_access
from app.models.user_model import CurrentUser

router = APIRouter()


@router.post("/check")
async def check_client_emails(
    master_file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_read_access),
):
    """
    Inspect a master Excel file and report which clients do not yet have
    an email address stored in the database.

    • Returns existing clients with their stored emails.
    • Returns the list of client names whose emails are missing.

    This can be called before the main upload to let the admin pre-populate
    emails without triggering the full processing pipeline.
    """
    if not master_file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="master_file must be an Excel file (.xlsx / .xls)",
        )

    try:
        contents = await master_file.read()
        import io
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse Excel file: {exc}",
        )

    if "Order id" not in [str(c).strip() for c in df.columns]:
        raise HTTPException(
            status_code=400,
            detail="Master file is missing required column: 'Order id'",
        )

    client_names = extract_clients_from_dataframe(df)

    if not client_names:
        raise HTTPException(
            status_code=400,
            detail="No client names found in 'Order id' column.",
        )

    result = await check_missing_client_emails(client_names)

    return {
        "total_clients": len(client_names),
        "existing_count": len(result["existing"]),
        "missing_count": len(result["missing"]),
        "existing": result["existing"],
        "missing": result["missing"],
    }
