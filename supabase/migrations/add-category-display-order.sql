-- Migration: Add display_order to categories table
-- This allows admins to manually define the order categories appear in the UI

-- Add display_order column to categories table
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN categories.display_order IS 'Custom sort order for category display (lower numbers appear first)';

-- Create index for sorting performance
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(organization_id, display_order);

-- Set initial display_order based on alphabetical order
UPDATE categories
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY name) as row_num
  FROM categories
) as subquery
WHERE categories.id = subquery.id;

-- Verify
SELECT 'Category display_order column added successfully!' as message;
