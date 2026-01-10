-- ================================================
-- REFERRAL EARNINGS FEATURE - DATABASE UPDATES
-- Date: 2026-01-09
-- ================================================

-- This SQL file contains all the database schema updates needed
-- for the My Referral Earnings feature in the Lead CRM

-- ================================================
-- 1. ADD REVIEW STATUS COLUMN TO LEADS TABLE
-- ================================================
-- This column tracks whether a WIN lead has been reviewed by the customer
-- Possible values: 'pending', 'yet_to_review', 'reviewed'

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending'
CHECK (review_status IN ('pending', 'yet_to_review', 'reviewed'));

-- Add comment to explain the column
COMMENT ON COLUMN leads.review_status IS 'Review status for WIN leads: pending, yet_to_review, or reviewed';

-- ================================================
-- 2. ADD REVIEWED BY COLUMN TO LEADS TABLE
-- ================================================
-- This column stores the user ID of who marked the lead as reviewed
-- (typically the sales rep who clicked the "Reviewed" button)

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN leads.reviewed_by IS 'User ID of who marked this lead as reviewed';

-- ================================================
-- 3. ADD INCENTIVE TRACKING COLUMNS TO LEADS TABLE
-- ================================================
-- These columns track whether a lead has an incentive and the amount

-- Column to track if lead has incentive (null = not set, false = no, true = yes)
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS has_incentive BOOLEAN DEFAULT NULL;

-- Column to store the incentive amount (only set if has_incentive = true)
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS incentive_amount DECIMAL(10, 2) DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN leads.has_incentive IS 'Whether this lead has an incentive: null=not set, false=no, true=yes';
COMMENT ON COLUMN leads.incentive_amount IS 'The incentive amount in rupees (only set if has_incentive=true)';

-- ================================================
-- 4. CREATE INDEX FOR PERFORMANCE
-- ================================================
-- These indexes improve query performance for the referral earnings page

-- Index for querying reviewed leads by sales rep
CREATE INDEX IF NOT EXISTS idx_leads_sales_rep_reviewed
ON leads(sales_rep_id, review_status)
WHERE status = 'win' AND review_status = 'reviewed';

-- Index for querying by reviewer
CREATE INDEX IF NOT EXISTS idx_leads_reviewed_by
ON leads(reviewed_by)
WHERE reviewed_by IS NOT NULL;

-- ================================================
-- 5. UPDATE EXISTING WIN LEADS TO HAVE PENDING STATUS
-- ================================================
-- This sets all existing WIN leads that don't have a review_status to 'pending'

UPDATE leads
SET review_status = 'pending'
WHERE status = 'win'
  AND review_status IS NULL;

-- ================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================
-- Ensure proper access control for the new columns

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Sales reps can view their own leads review status" ON leads;
DROP POLICY IF EXISTS "Sales reps can update review status on their WIN leads" ON leads;
DROP POLICY IF EXISTS "Admins can update incentive information" ON leads;

-- Policy: Sales reps can view their own leads' review status
CREATE POLICY "Sales reps can view their own leads review status"
ON leads FOR SELECT
USING (
  sales_rep_id = auth.uid()
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Policy: Sales reps can update review_status on their own WIN leads
CREATE POLICY "Sales reps can update review status on their WIN leads"
ON leads FOR UPDATE
USING (
  sales_rep_id = auth.uid()
  AND status = 'win'
)
WITH CHECK (
  sales_rep_id = auth.uid()
  AND status = 'win'
);

-- Policy: Admins can update incentive information
CREATE POLICY "Admins can update incentive information"
ON leads FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- ================================================
-- 7. SAMPLE QUERIES FOR TESTING
-- ================================================

-- Query: Get all reviewed leads for a sales rep with incentives
/*
SELECT
  id,
  customer_name,
  customer_phone,
  invoice_no,
  sale_price,
  incentive_amount,
  review_status,
  created_at
FROM leads
WHERE sales_rep_id = '<your-sales-rep-id>'
  AND status = 'win'
  AND review_status = 'reviewed'
ORDER BY created_at DESC;
*/

-- Query: Calculate total incentive earnings for a sales rep
/*
SELECT
  sales_rep_id,
  COUNT(*) as reviewed_leads_count,
  SUM(incentive_amount) as total_incentive_earnings
FROM leads
WHERE sales_rep_id = '<your-sales-rep-id>'
  AND status = 'win'
  AND review_status = 'reviewed'
  AND incentive_amount IS NOT NULL
GROUP BY sales_rep_id;
*/

-- Query: Get summary of review statuses
/*
SELECT
  review_status,
  COUNT(*) as count
FROM leads
WHERE status = 'win'
GROUP BY review_status
ORDER BY count DESC;
*/

-- Query: Get all leads pending review for a sales rep
/*
SELECT
  id,
  customer_name,
  invoice_no,
  sale_price,
  review_status,
  created_at
FROM leads
WHERE sales_rep_id = '<your-sales-rep-id>'
  AND status = 'win'
  AND review_status IN ('pending', 'yet_to_review')
ORDER BY created_at DESC;
*/

-- ================================================
-- 8. DATA VALIDATION CHECKS
-- ================================================

-- Check that review_status is only set for WIN leads
/*
SELECT COUNT(*) as invalid_rows
FROM leads
WHERE status != 'win'
  AND review_status IS NOT NULL;
-- Expected: 0 (no invalid rows)
*/

-- Check that incentive_amount is only set when has_incentive is true
/*
SELECT COUNT(*) as invalid_rows
FROM leads
WHERE incentive_amount IS NOT NULL
  AND (has_incentive IS NULL OR has_incentive = false);
-- Expected: 0 (no invalid rows)
*/

-- Check that reviewed_by is only set for reviewed leads
/*
SELECT COUNT(*) as invalid_rows
FROM leads
WHERE reviewed_by IS NOT NULL
  AND review_status != 'reviewed';
-- Expected: 0 (no invalid rows)
*/

-- ================================================
-- 9. ROLLBACK SCRIPT (USE WITH CAUTION)
-- ================================================
-- Uncomment these lines ONLY if you need to remove the feature

/*
-- Remove indexes
DROP INDEX IF EXISTS idx_leads_sales_rep_reviewed;
DROP INDEX IF EXISTS idx_leads_reviewed_by;

-- Remove RLS policies
DROP POLICY IF EXISTS "Sales reps can view their own leads review status" ON leads;
DROP POLICY IF EXISTS "Sales reps can update review status on their WIN leads" ON leads;
DROP POLICY IF EXISTS "Admins can update incentive information" ON leads;

-- Remove columns (WARNING: This will delete all data in these columns)
ALTER TABLE leads DROP COLUMN IF EXISTS review_status;
ALTER TABLE leads DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE leads DROP COLUMN IF EXISTS has_incentive;
ALTER TABLE leads DROP COLUMN IF EXISTS incentive_amount;
*/

-- ================================================
-- END OF SQL FILE
-- ================================================
