import pandas as pd
import json
import os
from datetime import datetime
from fastapi import HTTPException

REQUIRED_COLUMNS = [
    "Customer_Name",
    "Customer_Email",
    "Parcel_Count",
    "Dispatch_Date",
    "Total_Weight",
    "Payment_Status"
]

COLUMNS_TO_REMOVE = [
    "Customer_ID",
    "Freight_Amount",
    "Sales_Engineer",
    "Internal_Remarks",
    "Customer_Phone"
]

def process_master_file(file_path: str, output_dir: str, batch_id: str):
    try:
        # 1. Read Excel
        df = pd.read_excel(file_path)
        
        # 2. Validate columns
        missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing_columns:
            raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing_columns)}")

        # 3. Remove unwanted columns if they exist
        drop_cols = [col for col in COLUMNS_TO_REMOVE if col in df.columns]
        df = df.drop(columns=drop_cols)
        
        # 3.5 Save Mother File (Requirement)
        mother_file_path = os.path.join(output_dir, "mother.xlsx")
        df.to_excel(mother_file_path, index=False)

        # 4. Process each row individually (NO GROUPING)
        rows = []
        
        # Ensure Dispatch_Date is datetime for proper formatting
        if 'Dispatch_Date' in df.columns:
            df['Dispatch_Date'] = pd.to_datetime(df['Dispatch_Date'], errors='coerce')

        # Iterate through each row in the dataframe
        for idx, row in df.iterrows():
            # Extract data from each row
            customer_name = row.get("Customer_Name", "Unknown")
            customer_email = str(row.get("Customer_Email", "")).strip()
            parcel_count = int(row.get("Parcel_Count", 0))
            total_weight = float(row.get("Total_Weight", 0.0))
            payment_status = row.get("Payment_Status", "")
            
            # Format dispatch date
            dispatch_date = None
            if "Dispatch_Date" in row and pd.notnull(row["Dispatch_Date"]):
                dispatch_date = row["Dispatch_Date"].strftime("%Y-%m-%d")
            
            # Create row record
            row_record = {
                "row_id": idx + 1,  # 1-based row ID
                "customer_name": customer_name,
                "customer_email": customer_email,
                "parcel_count": parcel_count,
                "total_weight": total_weight,
                "dispatch_date": dispatch_date,
                "payment_status": payment_status,
                "status": "NotSent"
            }
            rows.append(row_record)

        # 5. Save Row Data
        # summary_filename = f"{timestamp}.json" # Old way
        summary_path = os.path.join(output_dir, "summary.json")
        
        # Ensure directory exists just in case (though upload handles it)
        os.makedirs(output_dir, exist_ok=True)
        
        batch_data = {
            "batch_id": batch_id,
            "created_at": datetime.now().isoformat(),
            "rows": rows,  # Changed from "customers" to "rows"
            "total_rows": len(rows)
        }
        
        with open(summary_path, "w") as f:
            json.dump(batch_data, f, indent=4)

        # Create email_log.json for tracking
        email_log_path = os.path.join(output_dir, "email_log.json")
        email_log = {
            "batch_id": batch_id,
            "created_at": datetime.now().isoformat(),
            "emails": []
        }
        with open(email_log_path, "w") as f:
            json.dump(email_log, f, indent=4)

        return {
            "message": "Master processed successfully",
            "batch_id": batch_id,
            "total_rows": len(rows)
        }

    except Exception as e:
        # Re-raise HTTP exceptions, wrap others
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
