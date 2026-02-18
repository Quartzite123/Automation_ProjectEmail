import boto3
import time
import os
from botocore.exceptions import ClientError
from datetime import datetime
from app.config import settings
from app.services.aws_ses import get_ses_client

class AmazonSESEmailService:
    def __init__(self):
        self.client = get_ses_client()
        self.sender = f"{settings.SES_SENDER_NAME} <{settings.SES_SENDER_EMAIL}>"

    def enrich_data(self, row: dict) -> dict:
        """
        Enrich row data with fallback dummy values for missing fields
        """
        import random
        from datetime import datetime, timedelta
        
        # Generate random shipment ID if not present
        shipment_id = row.get('shipment_id', f"SHP{random.randint(10000, 99999)}")
        
        # Calculate expected date (3 days from now if not provided)
        expected_date = row.get('expected_date')
        if not expected_date:
            future_date = datetime.now() + timedelta(days=3)
            expected_date = future_date.strftime("%d %b %Y")
        
        return {
            "customer_name": row.get('customer_name', 'Valued Customer'),
            "customer_email": row.get('customer_email', ''),
            "shipment_id": shipment_id,
            "location_1": row.get('origin', 'Mumbai Hub'),
            "location_2": row.get('destination', 'Delhi Hub'),
            "vehicle_number": row.get('vehicle_number', 'MH12AB1234'),
            "expected_date": expected_date,
            "status": row.get('status', 'In Transit'),
            "customer_id": row.get('customer_id', f"CUST{random.randint(1000, 9999)}"),
            "shipment_count": 1,  # Each row is one shipment
            "total_parcels": row.get('parcel_count', 0),
            "total_weight": row.get('total_weight', 0),
            "pending_payments": 1 if row.get('payment_status') == 'Pending' else 0,
            "latest_dispatch": row.get('dispatch_date', 'N/A')
        }

    def build_shipment_email(self, data: dict) -> str:
        """
        Build professional HTML email template for shipment notification
        """
        html_template = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f6f8;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #2563eb; margin: 0; font-size: 24px;">
                    Shipment Update – Your Package is On Its Way! 🚚
                </h2>
            </div>

            <!-- Greeting -->
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Dear <strong>{data['customer_name']}</strong>,
            </p>

            <p style="color: #555; font-size: 14px; line-height: 1.6;">
                We're pleased to inform you that your shipment is on its way!
            </p>

            <!-- Shipment Details Table -->
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 40%;">
                        Shipment ID
                    </td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937;">
                        {data['shipment_id']}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">
                        From
                    </td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937;">
                        {data['location_1']}
                    </td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">
                        To
                    </td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937;">
                        {data['location_2']}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">
                        Vehicle Number
                    </td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937;">
                        {data['vehicle_number']}
                    </td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">
                        Expected Arrival
                    </td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937;">
                        {data['expected_date']}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">
                        Status
                    </td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; color: #10b981; font-weight: bold;">
                        {data['status']}
                    </td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">
                        Customer ID
                    </td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937;">
                        {data['customer_id']}
                    </td>
                </tr>
            </table>

            <!-- Summary Information -->
            <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.8;">
                    <strong>Shipment Summary:</strong><br>
                    Total Shipments: {data['shipment_count']} | 
                    Parcels: {data['total_parcels']} | 
                    Weight: {data['total_weight']} kg<br>
                    Latest Dispatch: {data['latest_dispatch']} | 
                    Pending Payments: {data['pending_payments']}
                </p>
            </div>

            <!-- Thank You Message -->
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                Thank you for choosing <strong>Kiirusxpress Ltd</strong>.
            </p>

            <!-- Divider -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

            <!-- Contact Information -->
            <div style="color: #6b7280; font-size: 13px; line-height: 1.8;">
                <p style="margin: 5px 0;">📞 Phone: +91-9000000000</p>
                <p style="margin: 5px 0;">📧 Email: support@kiirusxpress.com</p>
                <p style="margin: 5px 0;">🌐 Website: www.kiirusxpress.com</p>
            </div>

            <!-- Footer -->
            <p style="color: #9ca3af; font-size: 11px; margin-top: 20px; text-align: center;">
                This is an automated email. Please do not reply.
            </p>
        </div>
    </div>
</body>
</html>
"""
        return html_template


    def send_email(self, summary: dict) -> bool:
        # Enrich data with fallback values
        enriched_data = self.enrich_data(summary)
        
        # Build HTML email
        html_body = self.build_shipment_email(enriched_data)
        
        # Professional subject line
        subject = "Shipment Update – Kiirusxpress"
        
        try:
            response = self.client.send_email(
                Source=self.sender,
                Destination={"ToAddresses": [summary["customer_email"]]},
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {
                        "Html": {
                            "Data": html_body,
                            "Charset": "UTF-8"
                        }
                    }
                }
            )
            print(f"✅ Email sent successfully to {summary.get('customer_email')}")
            print(f"   Message ID: {response.get('MessageId')}")
            return True
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            
            print(f"\n❌ SES ERROR DETAILS:")
            print(f"   Error Code: {error_code}")
            print(f"   Error Message: {error_message}")
            print(f"   Recipient: {summary.get('customer_email')}")
            print(f"   Sender: {self.sender}")
            print(f"   Region: {settings.AWS_REGION}")
            print(f"   Full Error: {e}\n")
            
            # Re-raise with detailed message for logging
            raise Exception(f"SES Error [{error_code}]: {error_message}")
        except Exception as e:
            print(f"❌ Unexpected error sending email: {str(e)}")
            raise

    def log_email_status(self, batch_id, email, status, error=None):
        log_dir = "app/storage/logs"
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "email_logs.txt")
        
        timestamp = datetime.now().isoformat()
        log_entry = f"{timestamp} | Batch: {batch_id} | Email: {email} | Status: {status}"
        if error:
            log_entry += f" | Error: {error}"
        
        with open(log_file, "a") as f:
            f.write(log_entry + "\n")

    def send_batch_emails(self, batch_data: dict, limit = None) -> dict:
        """
        Send emails in controlled batches - row-based workflow
        
        Args:
            batch_data: Batch data containing rows
            limit: Maximum number of emails to send (int) or "all" to send all
        
        Returns:
            dict with sent, failed, requested, and remaining counts
        """
        batch_id = batch_data.get("batch_id", "unknown")
        rows = batch_data.get("rows", [])
        
        # Filter rows eligible to send (status = NotSent)
        eligible_rows = [r for r in rows if r.get("status") == "NotSent"]
        total_eligible = len(eligible_rows)
        
        # Safety check - no pending emails
        if total_eligible == 0:
            raise Exception("No pending emails to send")
        
        # Apply limit
        if limit == "all":
            rows_to_send = eligible_rows
            requested = "all"
        elif limit is not None and isinstance(limit, int) and limit > 0:
            rows_to_send = eligible_rows[:limit]
            requested = min(limit, total_eligible)
        else:
            rows_to_send = eligible_rows
            requested = total_eligible
        
        print(f"\n📧 Starting batch email send for batch: {batch_id}")
        print(f"   Total eligible rows: {total_eligible}")
        print(f"   Requested to send: {requested}")
        print(f"   Will send to: {len(rows_to_send)}")
        
        sent_count = 0
        failed_count = 0
        errors = []
        
        for row in rows_to_send:
            email = row.get("customer_email")
            row_id = row.get("row_id", "?")
            try:
                self.send_email(row)
                row["status"] = "Sent"
                row["sent_at"] = datetime.now().isoformat()
                sent_count += 1
                self.log_email_status(batch_id, f"Row {row_id}: {email}", "Sent")
            except Exception as e:
                row["status"] = "Failed"
                row["error"] = str(e)
                failed_count += 1
                errors.append({
                    "row_id": row_id,
                    "email": email,
                    "reason": str(e)
                })
                self.log_email_status(batch_id, f"Row {row_id}: {email}", "Failed", str(e))
            
            # Rate limiting
            time.sleep(0.1)
        
        remaining_eligible = total_eligible - sent_count
        
        print(f"\n📊 Batch email send complete:")
        print(f"   Requested: {requested}")
        print(f"   Sent: {sent_count}")
        print(f"   Failed: {failed_count}")
        print(f"   Remaining: {remaining_eligible}\n")
        
        return {
            "batch_id": batch_id,
            "requested": requested,
            "sent": sent_count,
            "failed": failed_count,
            "remaining": remaining_eligible,
            "errors": errors
        }
