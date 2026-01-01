-- Migration: Add Win/Lost Flow to Leads Table (Safe Version)
-- Run this entire script in Supabase SQL Editor

-- Step 1: Add new columns to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'lost',
  ADD COLUMN IF NOT EXISTS invoice_no TEXT,
  ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2);

-- Step 2: Update existing leads to have status='lost'
UPDATE leads SET status = 'lost' WHERE status IS NULL;

-- Step 3: Create status enum constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('win', 'lost'));

-- Step 4: Add unique constraint for invoice_no per organization
DROP INDEX IF EXISTS unique_invoice_per_org;
CREATE UNIQUE INDEX unique_invoice_per_org
  ON leads(organization_id, invoice_no)
  WHERE invoice_no IS NOT NULL;

-- Step 5: Add indexes for performance
DROP INDEX IF EXISTS idx_leads_status;
DROP INDEX IF EXISTS idx_leads_org_status;
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_org_status ON leads(organization_id, status);

-- Step 6: Add comments
COMMENT ON COLUMN leads.status IS 'Lead outcome: win (sale completed) or lost (potential customer)';
COMMENT ON COLUMN leads.invoice_no IS 'Invoice number for Win leads - unique per organization';
COMMENT ON COLUMN leads.sale_price IS 'Actual sale price for Win leads (₹500-₹500,000)';

-- NOTE: We are NOT adding the check_win_lost_fields constraint
-- because it would fail on existing 'lost' leads that have NULL values.
-- The application logic handles validation instead.
