-- Migration: Add review_status to leads table
-- This allows tracking whether customers have reviewed the business after a Win

-- Add review_status column to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('pending', 'reviewed', 'yet_to_review'));

-- Set default to 'pending' for Win leads
UPDATE leads
SET review_status = 'pending'
WHERE status = 'win' AND review_status IS NULL;

-- Add comment
COMMENT ON COLUMN leads.review_status IS 'Review status for Win leads: pending (not asked), reviewed (customer left review), yet_to_review (customer declined)';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_leads_review_status ON leads(review_status) WHERE review_status IS NOT NULL;

-- Verify
SELECT 'Review status column added successfully!' as message;
