-- Migration: Make Lost-specific fields nullable for Win leads
-- This allows Win leads to be created without deal_size, model_id, purchase_timeline, not_today_reason

-- Step 1: Remove NOT NULL constraints from Lost-specific fields
ALTER TABLE leads
  ALTER COLUMN deal_size DROP NOT NULL,
  ALTER COLUMN model_id DROP NOT NULL,
  ALTER COLUMN purchase_timeline DROP NOT NULL,
  ALTER COLUMN not_today_reason DROP NOT NULL;

-- Step 2: Update any existing NULL values to ensure consistency
-- (This is just a safety measure - there shouldn't be any NULL values in existing Lost leads)

-- Step 3: Add comments explaining the optional nature of these fields
COMMENT ON COLUMN leads.deal_size IS 'Deal size for Lost leads only (required for Lost, NULL for Win)';
COMMENT ON COLUMN leads.model_id IS 'Model ID for Lost leads only (required for Lost, NULL for Win)';
COMMENT ON COLUMN leads.purchase_timeline IS 'Purchase timeline for Lost leads only (required for Lost, NULL for Win)';
COMMENT ON COLUMN leads.not_today_reason IS 'Reason for Lost leads only (required for Lost, NULL for Win)';
