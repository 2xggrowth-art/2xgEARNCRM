-- Migration: Add Multi-Provider WhatsApp Support
-- Date: 2026-01-15
-- Description: Adds support for multiple WhatsApp providers (Meta Cloud API, Whatstool.business, etc.)

-- Add new columns to organizations table for multi-provider support
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT DEFAULT 'meta' CHECK (whatsapp_provider IN ('meta', 'whatstool', 'other')),
ADD COLUMN IF NOT EXISTS whatsapp_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS whatsapp_is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS waba_id TEXT,
ADD COLUMN IF NOT EXISTS google_review_qr_url TEXT;

-- Add comments
COMMENT ON COLUMN organizations.whatsapp_provider IS 'WhatsApp provider type: meta (Meta Cloud API), whatstool (Whatstool.business), other';
COMMENT ON COLUMN organizations.whatsapp_config IS 'Provider-specific configuration stored as JSON';
COMMENT ON COLUMN organizations.whatsapp_is_active IS 'Whether WhatsApp integration is currently active';
COMMENT ON COLUMN organizations.waba_id IS 'WhatsApp Business Account ID (for Meta provider)';
COMMENT ON COLUMN organizations.google_review_qr_url IS 'Google Review QR code image URL';

-- Migrate existing Meta configurations to new structure
-- This will move existing whatsapp_access_token and whatsapp_phone_number_id to whatsapp_config
UPDATE organizations
SET whatsapp_config = jsonb_build_object(
  'accessToken', whatsapp_access_token,
  'phoneNumberId', whatsapp_phone_number_id
)
WHERE whatsapp_access_token IS NOT NULL OR whatsapp_phone_number_id IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_whatsapp_provider ON organizations(whatsapp_provider) WHERE whatsapp_provider IS NOT NULL;

RAISE NOTICE 'Multi-provider WhatsApp support added successfully';
