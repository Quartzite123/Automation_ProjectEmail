import json
import os
import glob
from fastapi import HTTPException
from app.services.batch_service import BatchService

STORAGE_DIR = "app/storage/batches"

def load_latest_batch():
    batch_service = BatchService()
    batches = batch_service.list_batches()
    
    if not batches:
        raise HTTPException(status_code=404, detail="No batches found. Please upload a master file first.")
        
    latest_id = batches[0]["batch_id"]
    return load_batch_by_id(latest_id)

def load_batch_by_id(batch_id: str):
    # Security check: basic directory traversal prevention
    if ".." in batch_id or "/" in batch_id:
        raise HTTPException(status_code=400, detail="Invalid batch ID")
        
    file_path = os.path.join(STORAGE_DIR, batch_id, "summary.json")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Batch not found")
    
    try:
        with open(file_path, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load batch file: {str(e)}")

def save_batch(batch_data: dict):
    batch_id = batch_data.get("batch_id")
    if not batch_id:
        raise HTTPException(status_code=500, detail="Batch ID missing in data")
        
    file_path = os.path.join(STORAGE_DIR, batch_id, "summary.json")
    
    try:
        with open(file_path, "w") as f:
            json.dump(batch_data, f, indent=4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save batch file: {str(e)}")

def update_customer_status(batch_id: str, email: str, new_status: str):
    # 1. Load batch
    batch_data = load_batch_by_id(batch_id)
    
    # 2. Find customer
    customers = batch_data.get("customers", [])
    found = False
    
    for customer in customers:
        if customer.get("customer_email") == email:
            customer["status"] = new_status
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Customer not found in this batch")
        
    # 3. Save batch
    save_batch(batch_data)
    
    return {
        "message": f"Customer status updated to {new_status}",
        "customer_email": email,
        "status": new_status,
        "batch_id": batch_id
    }
