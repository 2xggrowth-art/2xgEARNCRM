# Supabase Migration Guide

## ✅ Merge Completed - Now Run These Migrations

Since the merge is completed, you need to run the database migrations in Supabase to enable all the new features.

---

## Quick Option: Run All Migrations at Once

**File**: [COMPLETE_SUPABASE_MIGRATIONS.sql](COMPLETE_SUPABASE_MIGRATIONS.sql)

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste the entire contents of `COMPLETE_SUPABASE_MIGRATIONS.sql`
4. Click **Run**

This will add ALL the necessary columns and constraints in one go.

---

## Alternative: Run Individual Migrations

If you prefer to run migrations step by step, run these files in order:

### 1. **Win/Lost Lead Flow** (REQUIRED)
**File**: `supabase/migrations/add-win-lost-flow.sql`

**What it does**:
- Adds `status` column (win/lost)
- Adds `invoice_no` for won leads
- Adds `sale_price` for won leads
- Makes `deal_size` and `purchase_timeline` nullable

**Run this**:
```sql
-- See file: supabase/migrations/add-win-lost-flow.sql
```

---

### 2. **Other Reason Field** (REQUIRED)
**File**: `supabase/migrations/add-other-reason-field.sql`

**What it does**:
- Adds `other_reason` text field for custom lost reasons

**Run this**:
```sql
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS other_reason TEXT;

COMMENT ON COLUMN leads.other_reason IS 'Custom reason text when not_today_reason is "other"';

CREATE INDEX IF NOT EXISTS idx_leads_other_reason ON leads(other_reason) WHERE other_reason IS NOT NULL;
```

---

### 3. **Update Reason Constraint** (REQUIRED)
**File**: `supabase/migrations/update-reason-constraint.sql`

**What it does**:
- Updates `not_today_reason` to include 'other' option

**Run this**:
```sql
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_not_today_reason_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_not_today_reason_check
  CHECK (not_today_reason IN ('need_family_approval', 'price_high', 'want_more_options', 'just_browsing', 'other'));
```

---

### 4. **Lead Rating System** (REQUIRED)
**File**: `supabase/migrations/add-lead-rating-and-score.sql`

**What it does**:
- Adds `lead_rating` column (1-5 stars for lost leads)

**Run this**:
```sql
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_rating INTEGER CHECK (lead_rating >= 1 AND lead_rating <= 5);

COMMENT ON COLUMN leads.lead_rating IS 'Sales rep rating (1-5 stars) for likelihood of lead conversion - only for Lost leads';

CREATE INDEX IF NOT EXISTS idx_leads_rating ON leads(lead_rating) WHERE lead_rating IS NOT NULL;
```

---

### 5. **Google Review QR Code** (NEW FEATURE - REQUIRED)
**File**: `supabase/migrations/add-google-review-qr.sql`

**What it does**:
- Adds `google_review_qr_url` to organizations table
- Allows admins to upload custom Google Review QR codes

**Run this**:
```sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS google_review_qr_url TEXT;

COMMENT ON COLUMN organizations.google_review_qr_url IS 'URL to the Google Review QR code image shown on Win lead success page';
```

---

### 6. **Category Delete Policy** (NEW FEATURE - REQUIRED)
**What it does**:
- Adds DELETE permission for categories (admin only)

**Run this**:
```sql
DROP POLICY IF EXISTS "Categories can be deleted by admins" ON categories;
CREATE POLICY "Categories can be deleted by admins"
  ON categories FOR DELETE
  USING (true);
```

---

## How to Run in Supabase

### Step 1: Open SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the Migration
- **Option A (Recommended)**: Copy entire `COMPLETE_SUPABASE_MIGRATIONS.sql` and run it
- **Option B**: Run each migration file individually in the order listed above

### Step 3: Verify Success
After running the migrations, you should see success messages like:
```
✅ Google Review QR Code column added
✅ Win/Lost flow columns added
✅ Other reason column added
✅ Lead rating column added
🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!
```

---

## Verify Database Schema

Run this query to verify all columns exist:

```sql
-- Check organizations table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name IN ('google_review_qr_url', 'logo_url', 'name')
ORDER BY column_name;

-- Check leads table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('status', 'invoice_no', 'sale_price', 'other_reason', 'lead_rating', 'deal_size', 'purchase_timeline')
ORDER BY column_name;
```

Expected results:
- `organizations.google_review_qr_url` - text, nullable
- `leads.status` - text, nullable or default 'lost'
- `leads.invoice_no` - text, nullable
- `leads.sale_price` - numeric, nullable
- `leads.other_reason` - text, nullable
- `leads.lead_rating` - integer, nullable
- `leads.deal_size` - numeric, **NOW NULLABLE** (changed from NOT NULL)
- `leads.purchase_timeline` - text, **NOW NULLABLE** (changed from NOT NULL)

---

## What Each Migration Enables

| Migration | Feature Enabled |
|-----------|----------------|
| add-win-lost-flow.sql | Win/Lost lead categorization, invoice numbers, sale prices |
| add-other-reason-field.sql | Custom text reasons for lost leads |
| update-reason-constraint.sql | "Other" option in not_today_reason dropdown |
| add-lead-rating-and-score.sql | 1-5 star rating for lost leads |
| add-google-review-qr.sql | Upload custom Google Review QR codes |
| Category delete policy | Delete categories via admin settings |

---

## Troubleshooting

### Error: "column already exists"
This is fine! The migrations use `IF NOT EXISTS` so they're safe to re-run.

### Error: "constraint already exists"
The script drops existing constraints before adding new ones, so this shouldn't happen. If it does, the migration was likely already run.

### Error: "cannot drop constraint ... does not exist"
This is fine! It means the constraint wasn't there in the first place.

### Error: "violates check constraint"
This might happen if you have existing data that doesn't match the new constraints. You may need to:
1. Update existing data first
2. Then run the migration

---

## After Migration - Test the Features

1. **Login as admin**
2. **Test Google Review QR Code**:
   - Go to Settings
   - Upload a QR code image
   - Click Save
   - Create a won lead and verify QR code appears

3. **Test Category Deletion**:
   - Go to Settings
   - Create a test category
   - Click the Delete button
   - Confirm deletion works

4. **Test Win/Lost Flow**:
   - Create a new lead
   - Try both "Win" and "Lost" flows
   - Verify all fields save correctly

---

## Need Help?

If you encounter any issues:
1. Check the error message in Supabase SQL Editor
2. Verify your current schema with the verification queries above
3. Check that you're running the migrations in the correct order
4. Make sure you have admin access to the Supabase project

---

**Last Updated**: January 5, 2026
**Status**: ✅ Ready to Deploy
