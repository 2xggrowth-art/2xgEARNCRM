-- Offer Leads Table for QR Code Customer Capture System
-- This table stores customer data collected via QR code offers and spin wheel prizes

CREATE TABLE IF NOT EXISTS offer_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sales_rep_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  address TEXT,
  locality VARCHAR(100),
  prize_won VARCHAR(100),
  coupon_code VARCHAR(20),
  coupon_expires_at TIMESTAMP WITH TIME ZONE,
  redeemed BOOLEAN DEFAULT FALSE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  -- Conversion tracking
  converted_to_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by phone (for duplicate checking)
CREATE INDEX IF NOT EXISTS idx_offer_leads_phone ON offer_leads(phone);

-- Index for sales rep queries
CREATE INDEX IF NOT EXISTS idx_offer_leads_sales_rep ON offer_leads(sales_rep_id);

-- Index for coupon validation
CREATE INDEX IF NOT EXISTS idx_offer_leads_coupon ON offer_leads(coupon_code) WHERE coupon_code IS NOT NULL;

-- Index for organization queries
CREATE INDEX IF NOT EXISTS idx_offer_leads_organization ON offer_leads(organization_id);

-- Enable Row Level Security
ALTER TABLE offer_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own organization's offer leads
CREATE POLICY "Users can view own org offer leads" ON offer_leads
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert offer leads for their organization
CREATE POLICY "Users can insert offer leads" ON offer_leads
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR
    -- Allow public inserts when sales_rep_id matches a valid user
    sales_rep_id IN (SELECT id FROM users)
  );

-- Policy: Users can update their organization's offer leads
CREATE POLICY "Users can update own org offer leads" ON offer_leads
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Comment on table
COMMENT ON TABLE offer_leads IS 'Customer leads captured via QR code offer system with spin wheel prizes';
