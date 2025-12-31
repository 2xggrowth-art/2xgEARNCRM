-- Migration: Add Win/Lost Flow to Leads Table
-- This migration adds fields for Win/Lost lead categorization

-- Step 1: Add new columns to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'lost',
  ADD COLUMN IF NOT EXISTS invoice_no TEXT,
  ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2);

-- Step 2: Create status enum constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('win', 'lost'));

-- Step 3: Add unique constraint for invoice_no per organization
CREATE UNIQUE INDEX IF NOT EXISTS unique_invoice_per_org
  ON leads(organization_id, invoice_no)
  WHERE invoice_no IS NOT NULL;

-- Step 4: Make existing Lost-specific fields nullable (they already should be)
-- deal_size, model_id, purchase_timeline, not_today_reason are already nullable

-- Step 5: Add check constraints for Win vs Lost fields
ALTER TABLE leads DROP CONSTRAINT IF EXISTS check_win_lost_fields;
ALTER TABLE leads
  ADD CONSTRAINT check_win_lost_fields
  CHECK (
    (status = 'win' AND invoice_no IS NOT NULL AND sale_price IS NOT NULL
     AND sale_price >= 500 AND sale_price <= 500000)
    OR
    (status = 'lost' AND deal_size IS NOT NULL AND model_id IS NOT NULL
     AND purchase_timeline IS NOT NULL)
  );

-- Step 6: Update existing leads to have status='lost' (default)
UPDATE leads SET status = 'lost' WHERE status IS NULL;

-- Step 7: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status);

-- Step 8: Update RLS policies (if needed - existing policies should work)
-- No changes needed - organization_id filtering already in place

COMMENT ON COLUMN leads.status IS 'Lead outcome: win (sale completed) or lost (potential customer)';
COMMENT ON COLUMN leads.invoice_no IS 'Invoice number for Win leads - unique per organization';
COMMENT ON COLUMN leads.sale_price IS 'Actual sale price for Win leads (₹500-₹500,000)';
