
import unittest
from unittest.mock import MagicMock, patch
import os
import json
from app.services.email_service import AmazonSESEmailService

class TestEmailService(unittest.TestCase):
    def setUp(self):
        self.mock_batch = {
            "batch_id": "test_email_batch",
            "customers": [
                {
                    "customer_name": "Approved User",
                    "customer_email": "approved@example.com",
                    "status": "Approved",
                    "shipment_count": 5
                },
                {
                    "customer_name": "Pending User",
                    "customer_email": "pending@example.com",
                    "status": "Pending",
                    "shipment_count": 2
                }
            ]
        }

    @patch("boto3.client")
    def test_send_batch_emails(self, mock_boto_client):
        # 1. Setup Mock
        mock_ses = MagicMock()
        mock_boto_client.return_value = mock_ses
        
        service = AmazonSESEmailService()
        
        # 2. Execute
        print("Testing send_batch_emails...")
        stats = service.send_batch_emails(self.mock_batch)
        
        # 3. Verify
        print(f"Stats: {stats}")
        self.assertEqual(stats["sent"], 1)
        self.assertEqual(stats["total_approved"], 1)
        
        # Check if status updated
        approved_cust = self.mock_batch["customers"][0]
        self.assertEqual(approved_cust["status"], "Sent")
        self.assertTrue("sent_at" in approved_cust)
        print("Status updated to Sent correctly.")
        
        # Check pending user untouched
        pending_cust = self.mock_batch["customers"][1]
        self.assertEqual(pending_cust["status"], "Pending")
        print("Pending user remained Pending.")
        
        # Check SES call
        mock_ses.send_email.assert_called_once()
        print("SES send_email called exactly once.")

if __name__ == "__main__":
    unittest.main()
