
import unittest
from unittest.mock import MagicMock, patch
import os
import shutil
import pandas as pd
from app.services.processing_service import process_master_file
from app.services.file_service import load_latest_batch, update_customer_status, load_batch_by_id
from app.services.email_service import AmazonSESEmailService
from app.services.batch_service import BatchService

class TestBrick6(unittest.TestCase):
    def setUp(self):
        self.test_batch_id = "batch_test_brick6"
        self.batch_dir = os.path.join("app/storage/batches", self.test_batch_id)
        os.makedirs(self.batch_dir, exist_ok=True)
        
        # Create a mock master file
        self.master_path = os.path.join(self.batch_dir, "master.xlsx")
        df = pd.DataFrame({
            "Customer_Name": ["Test User"],
            "Customer_Email": ["test@example.com"],
            "Parcel_Count": [5],
            "Dispatch_Date": ["2023-01-01"],
            "Total_Weight": [10.0],
            "Payment_Status": ["Pending"]
        })
        df.to_excel(self.master_path, index=False)

    def tearDown(self):
        if os.path.exists(self.batch_dir):
            shutil.rmtree(self.batch_dir)
        # Clean up logs
        if os.path.exists("app/storage/logs/email_logs.txt"):
            os.remove("app/storage/logs/email_logs.txt")

    @patch("boto3.client")
    def test_full_flow(self, mock_boto):
        print("\n--- Testing Brick 6 Flow ---")
        
        # 1. Processing
        print("1. Processing Master File...")
        process_master_file(self.master_path, self.batch_dir, self.test_batch_id)
        self.assertTrue(os.path.exists(os.path.join(self.batch_dir, "summary.json")))
        
        # 2. Batch Listing
        print("2. Listing Batches...")
        batch_service = BatchService()
        batches = batch_service.list_batches()
        found = any(b["batch_id"] == self.test_batch_id for b in batches)
        self.assertTrue(found)
        
        # 3. File Service Loading
        print("3. Loading Batch...")
        batch_data = load_batch_by_id(self.test_batch_id)
        self.assertEqual(batch_data["batch_id"], self.test_batch_id)
        self.assertEqual(len(batch_data["customers"]), 1)
        
        # 4. Approval
        print("4. Approving Customer...")
        update_customer_status(self.test_batch_id, "test@example.com", "Approved")
        
        # 5. Email Sending (Mocked)
        print("5. Sending Emails...")
        mock_ses = MagicMock()
        mock_boto.return_value = mock_ses
        
        email_service = AmazonSESEmailService()
        # Reload to get approved status
        batch_data = load_batch_by_id(self.test_batch_id)
        stats = email_service.send_batch_emails(batch_data)
        
        self.assertEqual(stats["sent"], 1)
        
        # 6. Verify Log
        print("6. Verifying Logs...")
        self.assertTrue(os.path.exists("app/storage/logs/email_logs.txt"))
        with open("app/storage/logs/email_logs.txt", "r") as f:
            content = f.read()
            self.assertIn(self.test_batch_id, content)
            self.assertIn("Sent", content)
            
        print("Brick 6 Flow Verified Successfully!")

if __name__ == "__main__":
    unittest.main()
