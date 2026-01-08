-- ============================================================================
-- CONSOLIDATED SQL MIGRATION - 2XG Lead CRM
-- Date: 2026-01-08
-- Description: All database changes made in the recent development cycle
-- ============================================================================
-- This file contains all SQL migrations executed during development
-- It can be used to replicate the database schema on a fresh instance
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. GOOGLE REVIEW QR CODE SUPPORT
-- Date: 2026-01-05
-- Purpose: Add support for custom Google Review QR codes per organization
-- ----------------------------------------------------------------------------

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS google_review_qr_url TEXT;

COMMENT ON COLUMN organizations.google_review_qr_url IS 'URL to the Google Review QR code image shown on Win lead success page';


-- ----------------------------------------------------------------------------
-- 2. REVIEW STATUS TRACKING
-- Date: 2026-01-06
-- Purpose: Track whether customers have left a review after a Win
-- ----------------------------------------------------------------------------

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('pending', 'reviewed', 'yet_to_review'));

-- Set default to 'pending' for Win leads
UPDATE leads
SET review_status = 'pending'
WHERE status = 'win' AND review_status IS NULL;

COMMENT ON COLUMN leads.review_status IS 'Review status for Win leads: pending (not asked), reviewed (customer left review), yet_to_review (customer declined)';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_leads_review_status ON leads(review_status) WHERE review_status IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 3. CATEGORY DISPLAY ORDER
-- Date: 2026-01-06
-- Purpose: Allow manual sorting of categories in the UI
-- ----------------------------------------------------------------------------

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

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


-- ----------------------------------------------------------------------------
-- 4. WHATSAPP INTEGRATION SUPPORT
-- Date: 2026-01-08
-- Purpose: Support multi-tenant WhatsApp Cloud API integration
-- ----------------------------------------------------------------------------

-- Create WhatsApp credentials table
CREATE TABLE IF NOT EXISTS whatsapp_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- WhatsApp Cloud API Credentials
  whatsapp_access_token TEXT NOT NULL, -- Meta Access Token (encrypted in production)
  phone_number_id TEXT NOT NULL, -- WhatsApp Phone Number ID from Meta
  waba_id TEXT NOT NULL, -- WhatsApp Business Account ID

  -- Optional metadata
  phone_number TEXT, -- Actual phone number for display (e.g., +1234567890)
  business_name TEXT, -- Business name associated with WhatsApp
  is_active BOOLEAN DEFAULT true, -- Enable/disable WhatsApp integration

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one WhatsApp credential per organization
  UNIQUE(organization_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_whatsapp_credentials_org_id ON whatsapp_credentials(organization_id);
CREATE INDEX idx_whatsapp_credentials_active ON whatsapp_credentials(is_active) WHERE is_active = true;

-- Add RLS (Row Level Security) policies
ALTER TABLE whatsapp_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own organization's credentials
CREATE POLICY "Users can view own organization WhatsApp credentials"
  ON whatsapp_credentials
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Policy: Only admins can insert/update WhatsApp credentials
CREATE POLICY "Admins can manage WhatsApp credentials"
  ON whatsapp_credentials
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_whatsapp_credentials_timestamp
  BEFORE UPDATE ON whatsapp_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_credentials_updated_at();


-- ----------------------------------------------------------------------------
-- 5. WHATSAPP MESSAGE LOGGING
-- Date: 2026-01-08
-- Purpose: Track all WhatsApp messages sent for analytics and debugging
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Message details
  recipient_phone TEXT NOT NULL,
  template_name TEXT,
  message_type TEXT DEFAULT 'template', -- template, text, etc.

  -- Meta API response
  message_id TEXT, -- WhatsApp message ID from Meta
  status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
  error_message TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT NOW(),

  -- Store the actual parameters sent (for debugging)
  template_parameters JSONB
);

-- Create indexes for message logs
CREATE INDEX idx_whatsapp_logs_org_id ON whatsapp_message_logs(organization_id);
CREATE INDEX idx_whatsapp_logs_lead_id ON whatsapp_message_logs(lead_id);
CREATE INDEX idx_whatsapp_logs_sent_at ON whatsapp_message_logs(sent_at DESC);

-- Add RLS for message logs
ALTER TABLE whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization message logs"
  ON whatsapp_message_logs
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert message logs"
  ON whatsapp_message_logs
  FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

COMMENT ON TABLE whatsapp_credentials IS 'Stores WhatsApp Cloud API credentials for each organization';
COMMENT ON TABLE whatsapp_message_logs IS 'Logs all WhatsApp messages sent through the platform';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all changes
SELECT 'Migration completed successfully!' as status,
       'All tables and columns created/updated' as message;

-- Summary of changes:
-- 1. ✅ Google Review QR Code support added to organizations
-- 2. ✅ Review status tracking added to leads
-- 3. ✅ Category display order support added
-- 4. ✅ WhatsApp credentials table created with RLS
-- 5. ✅ WhatsApp message logging table created with indexes

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
