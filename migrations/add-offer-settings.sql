-- Add offer/QR code settings to organizations table
-- These settings control the spin wheel prizes and WhatsApp notification number

-- WhatsApp number for offer notifications
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS offer_whatsapp_number VARCHAR(20);

-- JSON array of spin wheel prizes
-- Example: [{"label": "10% Off", "probability": 0.20, "color": "#FF6B6B", "textColor": "#FFFFFF"}]
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS offer_prizes JSONB DEFAULT '[
  {"label": "₹500 OFF", "probability": 0.10, "color": "#FF6B6B", "textColor": "#FFFFFF"},
  {"label": "₹100 OFF", "probability": 0.35, "color": "#4ECDC4", "textColor": "#FFFFFF"},
  {"label": "15 Accessories + 1 Gift FREE", "probability": 0.15, "color": "#45B7D1", "textColor": "#FFFFFF"},
  {"label": "₹1000 OFF Next Purchase", "probability": 0.05, "color": "#96CEB4", "textColor": "#FFFFFF"},
  {"label": "₹200 OFF", "probability": 0.20, "color": "#FFEAA7", "textColor": "#333333"},
  {"label": "Try Again", "probability": 0.15, "color": "#DFE6E9", "textColor": "#333333"}
]'::jsonb;

-- Whether the offer/QR feature is enabled for this organization
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS offer_enabled BOOLEAN DEFAULT true;

-- Comment on columns
COMMENT ON COLUMN organizations.offer_whatsapp_number IS 'WhatsApp number to receive notifications when customers win prizes';
COMMENT ON COLUMN organizations.offer_prizes IS 'JSON array of spin wheel prizes with label, probability, color, textColor';
COMMENT ON COLUMN organizations.offer_enabled IS 'Whether the QR offer feature is enabled';
