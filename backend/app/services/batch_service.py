import os
import json
import glob
from datetime import datetime

STORAGE_DIR = "app/storage/batches"

class BatchService:
    def list_batches(self):
        """List all batches with simplified status tracking"""
        if not os.path.exists(STORAGE_DIR):
            return []
            
        batch_dirs = glob.glob(os.path.join(STORAGE_DIR, "batch_*"))
        
        batches = []
        for batch_dir in batch_dirs:
            summary_path = os.path.join(batch_dir, "summary.json")
            if os.path.exists(summary_path):
                try:
                    with open(summary_path, "r") as f:
                        data = json.load(f)
                        
                    # Calculate simplified stats - using "rows" instead of "customers"
                    rows = data.get("rows", [])
                    total_rows = len(rows)
                    sent_count = len([r for r in rows if r.get("status") == "Sent"])
                    failed_count = len([r for r in rows if r.get("status") == "Failed"])
                    remaining_count = len([r for r in rows if r.get("status") == "NotSent"])
                    
                    batches.append({
                        "batch_id": data.get("batch_id"),
                        "created_at": data.get("created_at"),
                        "total_rows": total_rows,
                        "sent_count": sent_count,
                        "failed_count": failed_count,
                        "remaining_count": remaining_count
                    })
                except Exception as e:
                    print(f"Error loading batch {batch_dir}: {e}")
                    continue
        
        # Sort by created_at desc (newest first)
        return sorted(batches, key=lambda x: x.get("created_at", ""), reverse=True)
    
    def get_batch(self, batch_id: str):
        """Get full batch data by ID"""
        batch_dir = os.path.join(STORAGE_DIR, batch_id)
        summary_path = os.path.join(batch_dir, "summary.json")
        
        if not os.path.exists(summary_path):
            raise FileNotFoundError(f"Batch {batch_id} not found")
        
        with open(summary_path, "r") as f:
            return json.load(f)
    
    def update_batch(self, batch_data: dict):
        """Save updated batch data"""
        batch_id = batch_data.get("batch_id")
        batch_dir = os.path.join(STORAGE_DIR, batch_id)
        summary_path = os.path.join(batch_dir, "summary.json")
        
        with open(summary_path, "w") as f:
            json.dump(batch_data, f, indent=4)
    
    def get_batch_files(self, batch_id: str):
        """Get file paths for a batch"""
        batch_dir = os.path.join(STORAGE_DIR, batch_id)
        return {
            "master": os.path.join(batch_dir, "master.xlsx"),
            "mother": os.path.join(batch_dir, "mother.xlsx"),
            "summary": os.path.join(batch_dir, "summary.json"),
            "email_log": os.path.join(batch_dir, "email_log.json")
        }
