# FIX: Win Lead Creation Error

## Problem
When creating a Win lead, you get this error:
```
Failed to create lead: null value in column "deal_size" of relation "leads" violates not-null constraint
```

## Root Cause
The database table `leads` still has NOT NULL constraints on the Lost-specific fields:
- `deal_size`
- `model_id`
- `purchase_timeline`
- `not_today_reason`

Win leads don't use these fields (they use `invoice_no` and `sale_price` instead), but the database is forcing them to have values.

## Solution

### Step 1: Run SQL Migration in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/_/sql/new
2. Copy and paste the entire contents of `supabase/migrations/make-lost-fields-nullable.sql`
3. Click "Run" to execute the migration

**Migration SQL:**
```sql
-- Migration: Make Lost-specific fields nullable for Win leads
-- This allows Win leads to be created without deal_size, model_id, purchase_timeline, not_today_reason

-- Step 1: Remove NOT NULL constraints from Lost-specific fields
ALTER TABLE leads
  ALTER COLUMN deal_size DROP NOT NULL,
  ALTER COLUMN model_id DROP NOT NULL,
  ALTER COLUMN purchase_timeline DROP NOT NULL,
  ALTER COLUMN not_today_reason DROP NOT NULL;

-- Step 2: Add comments explaining the optional nature of these fields
COMMENT ON COLUMN leads.deal_size IS 'Deal size for Lost leads only (required for Lost, NULL for Win)';
COMMENT ON COLUMN leads.model_id IS 'Model ID for Lost leads only (required for Lost, NULL for Win)';
COMMENT ON COLUMN leads.purchase_timeline IS 'Purchase timeline for Lost leads only (required for Lost, NULL for Win)';
COMMENT ON COLUMN leads.not_today_reason IS 'Reason for Lost leads only (required for Lost, NULL for Win)';
```

### Step 2: Verify the Fix

After running the migration:

1. Try creating a Win lead again with:
   - Customer name and phone
   - Category selection
   - Invoice number (e.g., "INV001")
   - Sale price (e.g., 50000)

2. You should now see the QR code success screen

3. Check the admin dashboard - the Win lead should appear with:
   - Green background
   - Invoice number displayed
   - Sale price shown in green

## What This Migration Does

- **Removes NOT NULL constraints** from `deal_size`, `model_id`, `purchase_timeline`, and `not_today_reason`
- **Allows Win leads** to be created with these fields set to NULL
- **Maintains data integrity** - Lost leads will still have these fields populated by the application logic
- **No data loss** - Existing Lost leads are not affected

## Expected Result

After running this migration:
- ✅ Win leads can be created successfully
- ✅ Lost leads continue to work as before
- ✅ No existing data is modified
- ✅ Database schema matches the Win/Lost flow design
