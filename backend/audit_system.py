import unittest
import requests
import os
import pandas as pd
import json
import time

# Configuration
BASE_URL = "http://localhost:8000/api"
MOCK_MASTER_PATH = "audit_master.xlsx"

class TestSystemAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create a compliant Master File
        df = pd.DataFrame({
            "Shipment_ID": [101, 102, 103],
            "Customer_ID": ["C1", "C1", "C2"],  # Should be removed
            "Customer_Name": ["Test Customer A", "Test Customer A", "Test Customer B"],
            "Customer_Email": ["test_a@example.com", "test_a@example.com", "test_b@example.com"],
            "Origin_Hub": ["Hub A", "Hub A", "Hub B"],
            "Destination_Hub": ["Hub X", "Hub Y", "Hub Z"],
            "Dispatch_Date": ["2026-02-17", "2026-02-18", "2026-02-17"],
            "Delivery_Date": ["2026-02-20", "2026-02-21", "2026-02-19"],
            "Parcel_Count": [5, 3, 10],
            "Total_Weight": [10.5, 5.0, 20.0],
            "Freight_Amount": [100, 50, 200], # Should be removed
            "Payment_Status": ["Pending", "Paid", "Pending"],
            "Sales_Engineer": ["SE1", "SE1", "SE2"], # Should be removed
            "Internal_Remarks": ["None", "Urgent", "Fragile"], # Should be removed
            "Customer_Phone": ["123", "123", "456"] # Should be removed
        })
        df.to_excel(MOCK_MASTER_PATH, index=False)
        print(f"Created mock master file: {MOCK_MASTER_PATH}")

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(MOCK_MASTER_PATH):
            os.remove(MOCK_MASTER_PATH)

    def test_01_upload_and_structure(self):
        print("\n--- Test 1: Upload & Structure ---")
        with open(MOCK_MASTER_PATH, "rb") as f:
            files = {"file": ("audit_master.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
            response = requests.post(f"{BASE_URL}/upload/master", files=files)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.batch_id = data.get("batch_id")
        self.__class__.batch_id = self.batch_id # Save for later tests
        print(f"Batch created: {self.batch_id}")
        
        # Verify Folder Structure
        batch_dir = os.path.join("app/storage/batches", self.batch_id)
        self.assertTrue(os.path.exists(batch_dir), "Batch directory not created")
        
        # Verify Files
        self.assertTrue(os.path.exists(os.path.join(batch_dir, "master.xlsx")), "master.xlsx not saved")
        self.assertTrue(os.path.exists(os.path.join(batch_dir, "mother.xlsx")), "mother.xlsx not saved (Requirement Step 3)")
        self.assertTrue(os.path.exists(os.path.join(batch_dir, "summary.json")), "summary.json not generated")

    def test_02_feature_engineering(self):
        print("\n--- Test 2: Feature Engineering (Mother File) ---")
        batch_dir = os.path.join("app/storage/batches", self.batch_id)
        mother_path = os.path.join(batch_dir, "mother.xlsx")
        
        df = pd.read_excel(mother_path)
        
        # Check removed columns
        removed_cols = ["Customer_ID", "Freight_Amount", "Sales_Engineer", "Internal_Remarks", "Customer_Phone"]
        for col in removed_cols:
            self.assertNotIn(col, df.columns, f"Column {col} was not removed from Mother file")
            
        print("Mother file structure verified.")

    def test_03_summary_generation(self):
        print("\n--- Test 3: Summary Generation ---")
        response = requests.get(f"{BASE_URL}/files", params={"batch_id": self.batch_id})
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        customers = data.get("data", [])
        self.assertEqual(len(customers), 2, "Should group into 2 customers")
        
        cust_a = next(c for c in customers if c["customer_email"] == "test_a@example.com")
        self.assertEqual(cust_a["shipment_count"], 2)
        self.assertEqual(cust_a["total_parcels"], 8)
        self.assertEqual(cust_a["status"], "Pending")

    def test_04_approval_workflow(self):
        print("\n--- Test 4: Approval Workflow ---")
        # Approve Customer A
        response = requests.post(f"{BASE_URL}/files/approve", json={"batch_id": self.batch_id, "customer_email": "test_a@example.com"})
        self.assertEqual(response.status_code, 200)
        
        # Reject Customer B
        response = requests.post(f"{BASE_URL}/files/reject", json={"batch_id": self.batch_id, "customer_email": "test_b@example.com"})
        self.assertEqual(response.status_code, 200)
        
        # Verify status updates
        response = requests.get(f"{BASE_URL}/files", params={"batch_id": self.batch_id})
        customers = response.json().get("data")
        
        cust_a = next(c for c in customers if c["customer_email"] == "test_a@example.com")
        cust_b = next(c for c in customers if c["customer_email"] == "test_b@example.com")
        
        self.assertEqual(cust_a["status"], "Approved")
        self.assertEqual(cust_b["status"], "Rejected")

    def test_05_email_spending(self):
        print("\n--- Test 5: Email Sending ---")
        # Trigger send
        response = requests.post(f"{BASE_URL}/email/send", json={"batch_id": self.batch_id})
        self.assertEqual(response.status_code, 200)
        stats = response.json()
        
        self.assertEqual(stats["sent"], 1, "Should send only 1 email (to Approved customer)")
        self.assertEqual(stats["total_approved"], 1)

    def test_06_logs_and_final_status(self):
        print("\n--- Test 6: Logs & Final Status ---")
        # Check logs
        response = requests.get(f"{BASE_URL}/email/logs")
        logs = response.json()
        
        found_log = False
        for log in logs:
            if log["batch_id"] == self.batch_id and log["email"] == "test_a@example.com":
                 self.assertIn(log["status"], ["Sent", "Failed"]) # Failed is acceptable if SES not configured, but log must exist
                 found_log = True
        
        self.assertTrue(found_log, "Log entry not found for sent email")
        
        # Verify Customer A status is now Sent (or Failed)
        response = requests.get(f"{BASE_URL}/files", params={"batch_id": self.batch_id})
        customers = response.json().get("data")
        cust_a = next(c for c in customers if c["customer_email"] == "test_a@example.com")
        self.assertIn(cust_a["status"], ["Sent", "Failed"])

if __name__ == "__main__":
    unittest.main()
