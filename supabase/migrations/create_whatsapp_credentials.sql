-- Create WhatsApp credentials table for storing user's WhatsApp Cloud API credentials
-- This allows each organization/user to use their own WhatsApp Business Account

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

-- Create index for faster lookups
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

-- Create table to log WhatsApp message sends (for analytics and debugging)
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
