from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
from datetime import datetime
from app.services.processing_service import process_master_file

router = APIRouter()

UPLOAD_DIR = "app/storage/master_files"

@router.post("/master")
async def upload_master(file: UploadFile = File(...)):
    # 1. Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
         raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file.")

    # 2. Create Batch Folder
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    batch_id = f"batch_{timestamp}"
    
    # New storage structure: app/storage/batches/{batch_id}/
    batch_dir = os.path.join("app/storage/batches", batch_id)
    os.makedirs(batch_dir, exist_ok=True)
    
    # 3. Save Master File
    filename = "master.xlsx" # Standardize name
    file_path = os.path.join(batch_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 4. Process file
    try:
        # Pass the file path and the batch directory
        result = process_master_file(file_path, batch_dir, batch_id)
        return result
    except Exception as e:
        # Cleanup on failure
        # shutil.rmtree(batch_dir) # Optional: remove partial batch
        raise HTTPException(status_code=400, detail=f"Processing failed: {str(e)}")
