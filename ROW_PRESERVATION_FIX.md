# Row Preservation Fix - Summary

## Issue Identified
**Problem**: After uploading a file with multiple rows, only one row appeared in Email Page and Files Page.

**Root Cause**: Backend was aggregating data using `df.groupby("Customer_Email")`, which merged multiple rows from the same customer into a single summary record.

---

## Solution Implemented
**Approach**: Remove all aggregation logic and preserve each row as an individual record.

---

## BEFORE vs AFTER

### BEFORE (Aggregated System)
```python
# Processing logic used groupby
grouped = df.groupby("Customer_Email")
for email, group in grouped:
    summary = {
        "customer_email": email,
        "shipment_count": len(group),  # AGGREGATED
        "total_parcels": group["Parcel_Count"].sum(),  # AGGREGATED
        "total_weight": group["Total_Weight"].sum(),  # AGGREGATED
        ...
    }
```

**Result**: 10 rows with same email → 1 aggregated customer record

### AFTER (Row-Based System)
```python
# Each row processed individually
for idx, row in df.iterrows():
    row_record = {
        "row_id": idx + 1,
        "customer_email": row["Customer_Email"],
        "parcel_count": row["Parcel_Count"],  # INDIVIDUAL
        "total_weight": row["Total_Weight"],  # INDIVIDUAL
        ...
    }
```

**Result**: 10 rows with same email → 10 individual row records ✅

---

## Changes Made

### 1. Backend Processing (`backend/app/services/processing_service.py`)

**Removed:**
- `df.groupby("Customer_Email")`
- Aggregation calculations (sum, count, max)
- Customer-based summary creation

**Added:**
- Row-by-row iteration using `df.iterrows()`
- Individual row record creation
- `row_id` field (1-based index)

**Data Structure Change:**
```json
// BEFORE
{
  "batch_id": "batch_20260217_123456",
  "customers": [
    {
      "customer_email": "john@example.com",
      "shipment_count": 5,  // Aggregated
      "total_parcels": 150,  // Sum of 5 rows
      "status": "NotSent"
    }
  ]
}

// AFTER
{
  "batch_id": "batch_20260217_123456",
  "rows": [
    {
      "row_id": 1,
      "customer_email": "john@example.com",
      "parcel_count": 30,  // Individual
      "status": "NotSent"
    },
    {
      "row_id": 2,
      "customer_email": "john@example.com",
      "parcel_count": 40,  // Individual
      "status": "NotSent"
    },
    // ... 3 more rows for john@example.com
  ],
  "total_rows": 5
}
```

### 2. Schema Models (`backend/app/models/schemas.py`)

**Changed:**
- `CustomerRecord` → `RowRecord`
- Added `row_id: int` field
- Changed `shipment_count` → individual row fields
- `customers: List` → `rows: List`

### 3. Batch Service (`backend/app/services/batch_service.py`)

**Updated:**
- Stats calculation now uses `data.get("rows", [])`
- Counts actual rows, not aggregated customers

### 4. Email Service (`backend/app/services/email_service.py`)

**Updated:**
- `send_batch_emails()` now processes `rows` instead of `customers`
- `enrich_data()` adapted for row-based fields
  - `shipment_count` → always 1 (each row is one shipment)
  - `total_parcels` → `parcel_count` (from row)
  - `pending_payments` → calculated from `payment_status`

### 5. Email Routes (`backend/app/api/routes/email.py`)

**Updated:**
- Preview endpoint uses `row_id` instead of `customer_email`
- Request schema: `EmailPreviewRequest` now requires `row_id`
- Response includes `row_id` for identification

### 6. Files Routes (`backend/app/api/routes/files.py`)

**Updated:**
- Returns `rows` instead of `customers`
- Response field: `total_rows` instead of `total_customers`

### 7. Frontend Email Page (`frontend/src/pages/EmailPage.jsx`)

**Updated:**
- State variable: `customers` → `rows`
- Preview uses `row_id` instead of `customer_email`
- Table displays:
  - Row ID column added
  - Individual row data (not aggregated)
  - `parcel_count` instead of `shipment_count`
  - `total_weight` from individual row

**Table Columns:**
```jsx
// BEFORE
Customer | Email | Shipments | Status | Actions

// AFTER
Row ID | Customer | Email | Details | Status | Actions
#1     | John Doe | john@   | 30 parcels | NotSent | Preview
```

---

## Test Scenario

### Upload File with 10 Rows (Same Customer)
```
Row 1: john@example.com, 30 parcels
Row 2: john@example.com, 40 parcels
Row 3: john@example.com, 25 parcels
...
Row 10: john@example.com, 35 parcels
```

### Expected Results

#### Email Page
- ✅ Shows 10 rows
- ✅ Each row has unique row_id (1-10)
- ✅ Each row shows individual parcel count
- ✅ Send 1 → Only row #1 marked as Sent
- ✅ Send 5 → Rows #2-6 marked as Sent
- ✅ Remaining: 4 rows with status NotSent

#### Files Page
- ✅ Batch shows "Total Rows: 10"
- ✅ Sent count updates as emails are sent
- ✅ Download mother.xlsx contains all 10 rows

---

## API Changes

### Old Endpoints
```
POST /api/email/preview
{
  "batch_id": "batch_123",
  "customer_email": "john@example.com"  ❌
}
```

### New Endpoints
```
POST /api/email/preview
{
  "batch_id": "batch_123",
  "row_id": 5  ✅
}
```

---

## Summary.json Structure

### Field Mapping

| Old Field | New Field | Change |
|-----------|-----------|--------|
| `customers` | `rows` | Renamed array |
| N/A | `row_id` | Added unique identifier |
| `customer_email` | `customer_email` | No change |
| `customer_name` | `customer_name` | No change |
| `shipment_count` | N/A | Removed (was aggregated) |
| `total_parcels` | `parcel_count` | Individual row value |
| `total_weight` | `total_weight` | Individual row value |
| `latest_dispatch` | `dispatch_date` | Individual row value |
| `pending_payments` | `payment_status` | Individual row value |

---

## Email Sending Logic

### Before
```python
# Select approved CUSTOMERS where status = Approved
eligible = [c for c in customers if c['status'] == 'Approved']
```

### After
```python
# Select unsent ROWS where status = NotSent
eligible = [r for r in rows if r['status'] == 'NotSent']
```

**Key Difference**: Each row gets its own email, preserving all individual records.

---

## Files Changed

### Backend (6 files)
1. ✅ `backend/app/services/processing_service.py` - Removed groupby
2. ✅ `backend/app/models/schemas.py` - Updated to RowRecord
3. ✅ `backend/app/services/batch_service.py` - Use rows
4. ✅ `backend/app/services/email_service.py` - Row-based sending
5. ✅ `backend/app/api/routes/email.py` - row_id preview
6. ✅ `backend/app/api/routes/files.py` - Return rows

### Frontend (1 file)
1. ✅ `frontend/src/pages/EmailPage.jsx` - Display all rows

---

## Verification Steps

1. ✅ Upload test file with 10 rows
2. ✅ Verify Email page shows 10 rows (not 1)
3. ✅ Verify Files page shows "Total Rows: 10"
4. ✅ Send 1 email → Only first row marked Sent
5. ✅ Send 5 emails → Next 5 rows marked Sent
6. ✅ Check remaining = 4 rows
7. ✅ Preview individual rows by row_id
8. ✅ Download mother.xlsx → Contains all 10 rows

---

## Migration Notes

### Existing Batches
Old batches with `customers` array will still exist. The system now expects `rows` array.

**Recommendation**: 
- New uploads will use the row-based system
- Old batches may not display correctly
- Re-upload files if needed for consistency

---

## Benefits

1. **Data Integrity**: All uploaded rows preserved
2. **Accurate Counts**: Row count = actual rows in file
3. **Individual Control**: Send emails for specific rows
4. **No Data Loss**: No aggregation = no information loss
5. **Clearer Tracking**: Row ID provides unique identification

---

## Performance Considerations

- **Before**: 1000 rows with 100 unique emails → 100 records
- **After**: 1000 rows → 1000 records

**Impact**: 10x more records to store, but preserves all data integrity.Storage is cheap; data loss is expensive.

---

## Summary

**Problem**: Groupby aggregation collapsed multiple rows into single customer records.

**Solution**: Process each row individually, preserve all data, assign unique row_id.

**Result**: Complete data preservation - every row in the uploaded file becomes a unique, email-able record.

---

**Fix Applied Successfully! ✅**

Each uploaded row is now preserved and trackable throughout the email sending workflow.
