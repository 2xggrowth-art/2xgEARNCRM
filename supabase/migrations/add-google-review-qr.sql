-- Migration: Add Google Review QR Code to Organizations
-- This allows organizations to upload a custom QR code for Google Reviews

-- Add google_review_qr_url column to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS google_review_qr_url TEXT;

-- Add comment
COMMENT ON COLUMN organizations.google_review_qr_url IS 'URL to the Google Review QR code image shown on Win lead success page';

-- Verify
SELECT 'Google Review QR column added successfully!' as message;
