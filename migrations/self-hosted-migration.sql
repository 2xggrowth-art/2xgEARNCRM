-- Self-Hosted PostgreSQL Migration
-- Consolidated schema for direct PostgreSQL (no Supabase dependencies)
-- All RLS policies removed — app handles auth via middleware
-- Run this on a fresh PostgreSQL database

-- ============================================
-- Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Tables (in dependency order)
-- ============================================

-- organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  whatsapp_phone_number_id TEXT,
  whatsapp_access_token TEXT,
  contact_number TEXT,
  whatsapp_provider TEXT DEFAULT 'meta' CHECK (whatsapp_provider IN ('meta', 'whatstool', 'other')),
  whatsapp_config JSONB DEFAULT '{}',
  whatsapp_is_active BOOLEAN DEFAULT true,
  waba_id TEXT,
  google_review_qr_url TEXT,
  offer_whatsapp_number VARCHAR(20),
  offer_prizes JSONB DEFAULT '[
    {"label": "₹500 OFF", "probability": 0.10, "color": "#FF6B6B", "textColor": "#FFFFFF"},
    {"label": "₹100 OFF", "probability": 0.35, "color": "#4ECDC4", "textColor": "#FFFFFF"},
    {"label": "15 Accessories + 1 Gift FREE", "probability": 0.15, "color": "#45B7D1", "textColor": "#FFFFFF"},
    {"label": "₹1000 OFF Next Purchase", "probability": 0.05, "color": "#96CEB4", "textColor": "#FFFFFF"},
    {"label": "₹200 OFF", "probability": 0.20, "color": "#FFEAA7", "textColor": "#333333"},
    {"label": "Try Again", "probability": 0.15, "color": "#DFE6E9", "textColor": "#333333"}
  ]'::jsonb,
  offer_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'manager', 'staff', 'sales_rep')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  pin_hash TEXT,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- models
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  sales_rep_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('win', 'lost')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  invoice_no TEXT,
  sale_price DECIMAL(12, 2),
  deal_size DECIMAL(12, 2),
  model_id UUID REFERENCES models(id) ON DELETE SET NULL,
  purchase_timeline TEXT CHECK (purchase_timeline IN ('today', '3_days', '7_days', '30_days')),
  not_today_reason TEXT CHECK (not_today_reason IN ('need_family_approval', 'price_high', 'want_more_options', 'just_browsing', 'other')),
  other_reason TEXT,
  lead_rating INTEGER CHECK (lead_rating BETWEEN 1 AND 5),
  review_status TEXT CHECK (review_status IN ('pending', 'reviewed', 'yet_to_review')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  has_incentive BOOLEAN DEFAULT NULL,
  incentive_amount DECIMAL(10, 2) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint on invoice_no per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_invoice
  ON leads(organization_id, invoice_no)
  WHERE invoice_no IS NOT NULL;

-- otp_verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- whatsapp_logs
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- whatsapp_credentials
CREATE TABLE IF NOT EXISTS whatsapp_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  whatsapp_access_token TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  phone_number TEXT,
  business_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- whatsapp_message_logs
CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  template_name TEXT,
  message_type TEXT DEFAULT 'template',
  message_id TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  template_parameters JSONB
);

-- role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'manager', 'staff', 'sales_rep')),
  permission TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission)
);

-- system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- offer_leads
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
  converted_to_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);

-- leads
CREATE INDEX IF NOT EXISTS idx_leads_organization ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_sales_rep ON leads(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_incentive ON leads(has_incentive) WHERE has_incentive IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_rating ON leads(lead_rating) WHERE lead_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_review_status ON leads(review_status) WHERE review_status IS NOT NULL;

-- categories
CREATE INDEX IF NOT EXISTS idx_categories_organization ON categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(organization_id, display_order);

-- models
CREATE INDEX IF NOT EXISTS idx_models_category ON models(category_id);

-- otp
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_verifications(expires_at);

-- organizations
CREATE INDEX IF NOT EXISTS idx_organizations_whatsapp_provider ON organizations(whatsapp_provider) WHERE whatsapp_provider IS NOT NULL;

-- offer_leads
CREATE INDEX IF NOT EXISTS idx_offer_leads_phone ON offer_leads(phone);
CREATE INDEX IF NOT EXISTS idx_offer_leads_sales_rep ON offer_leads(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_offer_leads_coupon ON offer_leads(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offer_leads_organization ON offer_leads(organization_id);

-- whatsapp
CREATE INDEX IF NOT EXISTS idx_whatsapp_credentials_org_id ON whatsapp_credentials(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_credentials_active ON whatsapp_credentials(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_org_id ON whatsapp_message_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_lead_id ON whatsapp_message_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_sent_at ON whatsapp_message_logs(sent_at DESC);

-- role_permissions & system_settings
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- ============================================
-- Functions
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create default categories for new org
CREATE OR REPLACE FUNCTION create_default_categories(org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO categories (organization_id, name) VALUES
    (org_id, 'Electric'),
    (org_id, 'Geared'),
    (org_id, 'Premium Geared'),
    (org_id, 'Single Speed'),
    (org_id, 'Kids')
  ON CONFLICT (organization_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Placeholder for default models
CREATE OR REPLACE FUNCTION create_default_models(cat_id UUID, org_id UUID)
RETURNS VOID AS $$
BEGIN
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS VOID AS $$
BEGIN
  DELETE FROM otp_verifications
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = p_user_id;
  RETURN EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role = user_role AND permission = permission_name
  );
END;
$$ LANGUAGE plpgsql;

-- Get team members for a manager
CREATE OR REPLACE FUNCTION get_team_members(manager_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  user_role TEXT,
  last_login TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.phone, u.role, u.last_login
  FROM users u
  WHERE u.manager_id = manager_user_id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Assign manager to user
CREATE OR REPLACE FUNCTION assign_manager(p_user_id UUID, manager_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_org UUID;
  manager_org UUID;
  manager_role TEXT;
BEGIN
  SELECT organization_id INTO user_org FROM users WHERE id = p_user_id;
  SELECT organization_id, role INTO manager_org, manager_role
  FROM users WHERE id = manager_user_id;
  IF user_org = manager_org AND manager_role = 'manager' THEN
    UPDATE users SET manager_id = manager_user_id WHERE id = p_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Auto-update whatsapp_credentials updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers
-- ============================================

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_credentials_timestamp ON whatsapp_credentials;
CREATE TRIGGER update_whatsapp_credentials_timestamp
BEFORE UPDATE ON whatsapp_credentials
FOR EACH ROW EXECUTE FUNCTION update_whatsapp_credentials_updated_at();

-- ============================================
-- Default Data
-- ============================================

-- Default role permissions
INSERT INTO role_permissions (role, permission, description) VALUES
('super_admin', 'view_all_organizations', 'View all organizations in the system'),
('super_admin', 'manage_organizations', 'Create, update, delete organizations'),
('super_admin', 'view_system_reports', 'Access system-wide analytics and reports'),
('super_admin', 'manage_all_users', 'Create, update, delete users across all orgs'),
('super_admin', 'manage_permissions', 'Update role permissions'),
('super_admin', 'view_all_leads', 'View leads across all organizations'),
('super_admin', 'export_system_data', 'Export system-wide data'),
('manager', 'view_team_leads', 'View leads from entire team'),
('manager', 'manage_team', 'Add, remove, assign staff and sales reps'),
('manager', 'set_targets', 'Set sales targets for team members'),
('manager', 'view_reports', 'View team performance reports'),
('manager', 'export_data', 'Export team data and reports'),
('manager', 'manage_categories', 'Manage product categories'),
('manager', 'view_organization_settings', 'View organization settings'),
('manager', 'update_organization_settings', 'Update organization settings'),
('manager', 'reset_team_pins', 'Reset PINs for team members'),
('manager', 'approve_incentives', 'Approve incentive payouts'),
('staff', 'view_assigned_leads', 'View leads assigned to them'),
('staff', 'create_leads', 'Create new leads'),
('staff', 'view_own_reports', 'View personal performance reports'),
('staff', 'update_own_leads', 'Update their own leads'),
('staff', 'view_categories', 'View product categories'),
('staff', 'view_targets', 'View assigned targets'),
('sales_rep', 'create_leads', 'Create new leads'),
('sales_rep', 'view_own_leads', 'View only their own leads'),
('sales_rep', 'update_own_leads', 'Update their own leads'),
('sales_rep', 'view_categories', 'View product categories'),
('sales_rep', 'view_targets', 'View assigned targets'),
('sales_rep', 'view_own_incentives', 'View personal incentive earnings')
ON CONFLICT (role, permission) DO NOTHING;

-- Default system settings
INSERT INTO system_settings (key, value, description) VALUES
('lead_score_decay_enabled', 'true', 'Enable automatic lead score decay'),
('lead_score_decay_days', '3', 'Days before lead score starts decaying'),
('lead_score_decay_points', '10', 'Points to deduct daily'),
('lead_expiry_days', '10', 'Days until lead auto-expires'),
('touchpoints_required', '2', 'Minimum touchpoints per lost lead'),
('whatsapp_enabled', 'true', 'Enable WhatsApp integration')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Table Comments
-- ============================================
COMMENT ON TABLE organizations IS 'Stores multi-tenant organization data';
COMMENT ON TABLE users IS 'Stores user accounts with role hierarchy';
COMMENT ON TABLE categories IS 'Product categories per organization';
COMMENT ON TABLE models IS 'Product models within categories';
COMMENT ON TABLE leads IS 'Customer leads captured by sales reps';
COMMENT ON TABLE otp_verifications IS 'OTP codes for phone authentication';
COMMENT ON TABLE whatsapp_logs IS 'Audit log for WhatsApp API calls';
COMMENT ON TABLE whatsapp_credentials IS 'WhatsApp Cloud API credentials per organization';
COMMENT ON TABLE whatsapp_message_logs IS 'WhatsApp message delivery tracking';
COMMENT ON TABLE role_permissions IS 'Permission matrix for each role';
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
COMMENT ON TABLE offer_leads IS 'Customer leads from QR code spin wheel offers';
