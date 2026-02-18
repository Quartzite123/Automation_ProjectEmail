
# This will be run via python -c
from app.services.file_service import save_batch, load_latest_batch, update_customer_status
import os
import json

# Mock data
mock_batch = {
    "batch_id": "test_batch_123",
    "customers": [
        {
            "customer_name": "Test Cust",
            "customer_email": "test@example.com",
            "shipment_count": 5,
            "total_parcels": 10,
            "total_weight": 50.5,
            "latest_dispatch": "2023-10-27",
            "pending_payments": 0,
            "status": "Pending"
        }
    ]
}

# Ensure storage dir
os.makedirs("app/storage/customer_summaries", exist_ok=True)

# 1. Save
save_batch(mock_batch)
print("Saved mock batch")

# 2. Load
loaded = load_latest_batch()
print(f"Loaded batch: {loaded['batch_id']}")

# 3. Approve
updated = update_customer_status("test_batch_123", "test@example.com", "Approved")
print(f"Updated status: {updated['status']}")

# 4. Verify persistence
reloaded = load_latest_batch()
cust = reloaded['customers'][0]
print(f"Persisted status: {cust['status']}")

# Cleanup
os.remove("app/storage/customer_summaries/test_batch_123.json")
print("Cleanup done")
