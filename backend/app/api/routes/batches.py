from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os
from app.services.batch_service import BatchService

router = APIRouter()
batch_service = BatchService()

@router.get("/")
async def list_batches():
    """List all batches with simplified stats"""
    return batch_service.list_batches()

@router.get("/{batch_id}")
async def get_batch(batch_id: str):
    """Get full batch data by ID"""
    try:
        return batch_service.get_batch(batch_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{batch_id}/files")
async def get_batch_files(batch_id: str):
    """Get file paths for a batch"""
    try:
        files = batch_service.get_batch_files(batch_id)
        # Check which files exist
        return {
            "batch_id": batch_id,
            "files": {
                "master": os.path.exists(files["master"]),
                "mother": os.path.exists(files["mother"]),
                "summary": os.path.exists(files["summary"]),
                "email_log": os.path.exists(files["email_log"])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{batch_id}/download/{file_type}")
async def download_batch_file(batch_id: str, file_type: str):
    """Download a specific file from a batch (master or mother)"""
    try:
        files = batch_service.get_batch_files(batch_id)
        
        if file_type == "master":
            file_path = files["master"]
        elif file_type == "mother":
            file_path = files["mother"]
        else:
            raise HTTPException(status_code=400, detail="Invalid file type. Use 'master' or 'mother'")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File {file_type}.xlsx not found")
        
        return FileResponse(
            path=file_path,
            filename=f"{batch_id}_{file_type}.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
