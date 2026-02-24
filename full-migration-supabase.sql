-- ================================================================
-- FULL DATABASE MIGRATION - Lead CRM + 2XG Earn
-- Run this in Supabase SQL Editor (single execution)
-- No RLS policies - app handles auth via middleware/JWT
-- ================================================================

-- ============================================
-- PART 1: Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PART 2: Core Tables
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
  google_place_id TEXT,
  google_review_link TEXT,
  nfc_enabled BOOLEAN DEFAULT FALSE,
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
  preferred_language TEXT DEFAULT 'hi' CHECK (preferred_language IN ('hi', 'en', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'or')),
  voice_input_enabled BOOLEAN DEFAULT TRUE,
  nfc_enabled BOOLEAN DEFAULT FALSE,
  profile_picture_url TEXT,
  monthly_salary DECIMAL(12,2),
  team_eval_score DECIMAL(3,1) CHECK (team_eval_score IS NULL OR (team_eval_score >= 0 AND team_eval_score <= 5)),
  staff_type TEXT DEFAULT 'sales' CHECK (staff_type IN ('sales', 'support', 'manager', 'admin')),
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
  created_via TEXT DEFAULT 'form' CHECK (created_via IN ('form', 'voice', 'import')),
  voice_transcript TEXT,
  data_quality_score DECIMAL(5,2) DEFAULT 100.00 CHECK (data_quality_score BETWEEN 0 AND 100),
  review_sent_at TIMESTAMPTZ,
  review_received_at TIMESTAMPTZ,
  review_deadline TIMESTAMPTZ,
  review_qualified BOOLEAN DEFAULT NULL,
  escalated_to_manager BOOLEAN DEFAULT FALSE,
  commission_rate_applied DECIMAL(5,3),
  commission_amount DECIMAL(10,2),
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
-- PART 3: 2XG Earn Tables
-- ============================================

-- streaks
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  bridges_available INTEGER DEFAULT 1,
  bridges_used INTEGER DEFAULT 0,
  last_bridge_reset DATE DEFAULT CURRENT_DATE,
  weekly_streaks INTEGER DEFAULT 0,
  monthly_streaks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- google_reviews
CREATE TABLE IF NOT EXISTS google_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sales_rep_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  method TEXT CHECK (method IN ('nfc', 'qr', 'sms', 'whatsapp')),
  review_link_sent_at TIMESTAMPTZ,
  google_place_id TEXT,
  review_submitted BOOLEAN DEFAULT FALSE,
  review_rating INTEGER CHECK (review_rating BETWEEN 1 AND 5),
  review_text TEXT,
  review_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- compliance_scores
CREATE TABLE IF NOT EXISTS compliance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  lead_logging_score DECIMAL(5,2) DEFAULT 0 CHECK (lead_logging_score BETWEEN 0 AND 100),
  review_collection_score DECIMAL(5,2) DEFAULT 0 CHECK (review_collection_score BETWEEN 0 AND 100),
  target_achievement_score DECIMAL(5,2) DEFAULT 0 CHECK (target_achievement_score BETWEEN 0 AND 100),
  streak_score DECIMAL(5,2) DEFAULT 0 CHECK (streak_score BETWEEN 0 AND 100),
  data_quality_score DECIMAL(5,2) DEFAULT 0 CHECK (data_quality_score BETWEEN 0 AND 100),
  overall_score DECIMAL(5,2) GENERATED ALWAYS AS (
    (lead_logging_score + review_collection_score + target_achievement_score +
     streak_score + data_quality_score) / 5
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- offline_actions
CREATE TABLE IF NOT EXISTS offline_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL,
  synced BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- daily_targets
CREATE TABLE IF NOT EXISTS daily_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  target_leads INTEGER DEFAULT 5,
  target_reviews INTEGER DEFAULT 2,
  target_sales_amount DECIMAL(10,2) DEFAULT 0,
  achieved_leads INTEGER DEFAULT 0,
  achieved_reviews INTEGER DEFAULT 0,
  achieved_sales_amount DECIMAL(10,2) DEFAULT 0,
  leads_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN target_leads > 0
    THEN (achieved_leads::DECIMAL / target_leads * 100)
    ELSE 0 END
  ) STORED,
  reviews_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN target_reviews > 0
    THEN (achieved_reviews::DECIMAL / target_reviews * 100)
    ELSE 0 END
  ) STORED,
  sales_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN target_sales_amount > 0
    THEN (achieved_sales_amount / target_sales_amount * 100)
    ELSE 0 END
  ) STORED,
  overall_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    (
      CASE WHEN target_leads > 0 THEN (achieved_leads::DECIMAL / target_leads * 100) ELSE 0 END +
      CASE WHEN target_reviews > 0 THEN (achieved_reviews::DECIMAL / target_reviews * 100) ELSE 0 END +
      CASE WHEN target_sales_amount > 0 THEN (achieved_sales_amount / target_sales_amount * 100) ELSE 0 END
    ) / 3
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================
-- PART 4: Incentive System Tables
-- ============================================

-- commission_rates
CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  commission_percentage DECIMAL(5,3) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  multiplier DECIMAL(4,2) DEFAULT 1.0 CHECK (multiplier >= 1.0 AND multiplier <= 10.0),
  min_sale_price DECIMAL(12,2) DEFAULT 0,
  premium_threshold DECIMAL(12,2) DEFAULT 50000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, category_name)
);

-- monthly_targets
CREATE TABLE IF NOT EXISTS monthly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL DEFAULT 1000000,
  achieved_amount DECIMAL(12,2) DEFAULT 0,
  achievement_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN target_amount > 0
    THEN LEAST(200, (achieved_amount / target_amount * 100))
    ELSE 0 END
  ) STORED,
  qualifies_for_incentive BOOLEAN GENERATED ALWAYS AS (
    achieved_amount >= target_amount
  ) STORED,
  set_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- penalties
CREATE TABLE IF NOT EXISTS penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  penalty_type TEXT NOT NULL CHECK (penalty_type IN (
    'late_arrival', 'unauthorized_absence', 'back_to_back_offs',
    'low_compliance', 'high_error_rate', 'non_escalated_lost_lead',
    'missing_documentation', 'low_team_eval', 'client_disrespect'
  )),
  penalty_percentage DECIMAL(5,2) NOT NULL CHECK (penalty_percentage >= 0 AND penalty_percentage <= 100),
  description TEXT,
  incident_date DATE,
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disputed', 'resolved', 'waived')),
  disputed_at TIMESTAMPTZ,
  dispute_reason TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- monthly_incentives
CREATE TABLE IF NOT EXISTS monthly_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  gross_commission DECIMAL(12,2) DEFAULT 0,
  streak_bonus DECIMAL(10,2) DEFAULT 0,
  review_bonus DECIMAL(10,2) DEFAULT 0,
  total_bonuses DECIMAL(10,2) GENERATED ALWAYS AS (streak_bonus + review_bonus) STORED,
  penalty_count INTEGER DEFAULT 0,
  penalty_percentage DECIMAL(5,2) DEFAULT 0,
  penalty_amount DECIMAL(12,2) DEFAULT 0,
  gross_total DECIMAL(12,2) GENERATED ALWAYS AS (gross_commission + streak_bonus + review_bonus) STORED,
  net_incentive DECIMAL(12,2) DEFAULT 0,
  user_monthly_salary DECIMAL(12,2),
  salary_cap_applied BOOLEAN DEFAULT FALSE,
  capped_amount DECIMAL(12,2),
  final_approved_amount DECIMAL(12,2),
  status TEXT DEFAULT 'calculating' CHECK (status IN ('calculating', 'pending_review', 'approved', 'paid', 'rejected')),
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  breakdown_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- team_pool_distributions
CREATE TABLE IF NOT EXISTS team_pool_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  total_pool_amount DECIMAL(12,2) NOT NULL,
  top_performer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  top_performer_amount DECIMAL(12,2),
  second_performer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  second_performer_amount DECIMAL(12,2),
  third_performer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  third_performer_amount DECIMAL(12,2),
  manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  manager_amount DECIMAL(12,2),
  support_staff_amount DECIMAL(12,2),
  others_pool_amount DECIMAL(12,2),
  status TEXT DEFAULT 'calculating' CHECK (status IN ('calculating', 'pending_approval', 'approved', 'distributed')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  distributed_at TIMESTAMPTZ,
  distribution_notes TEXT,
  distribution_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, month)
);

-- organization_incentive_config
CREATE TABLE IF NOT EXISTS organization_incentive_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  streak_bonus_7_days NUMERIC(10,2) NOT NULL DEFAULT 50,
  streak_bonus_14_days NUMERIC(10,2) NOT NULL DEFAULT 150,
  streak_bonus_30_days NUMERIC(10,2) NOT NULL DEFAULT 700,
  review_bonus_per_review NUMERIC(10,2) NOT NULL DEFAULT 10,
  penalty_late_arrival NUMERIC(5,2) NOT NULL DEFAULT 5,
  penalty_unauthorized_absence NUMERIC(5,2) NOT NULL DEFAULT 10,
  penalty_back_to_back_offs NUMERIC(5,2) NOT NULL DEFAULT 10,
  penalty_low_compliance NUMERIC(5,2) NOT NULL DEFAULT 10,
  penalty_high_error_rate NUMERIC(5,2) NOT NULL DEFAULT 10,
  penalty_non_escalated_lost_lead NUMERIC(5,2) NOT NULL DEFAULT 10,
  penalty_missing_documentation NUMERIC(5,2) NOT NULL DEFAULT 10,
  penalty_low_team_eval NUMERIC(5,2) NOT NULL DEFAULT 15,
  penalty_client_disrespect NUMERIC(5,2) NOT NULL DEFAULT 100,
  compliance_threshold NUMERIC(5,2) NOT NULL DEFAULT 96,
  error_rate_threshold NUMERIC(5,2) NOT NULL DEFAULT 1,
  team_eval_threshold NUMERIC(3,1) NOT NULL DEFAULT 4.0,
  team_pool_top_performer NUMERIC(5,2) NOT NULL DEFAULT 20,
  team_pool_second_performer NUMERIC(5,2) NOT NULL DEFAULT 12,
  team_pool_third_performer NUMERIC(5,2) NOT NULL DEFAULT 8,
  team_pool_manager NUMERIC(5,2) NOT NULL DEFAULT 20,
  team_pool_support_staff NUMERIC(5,2) NOT NULL DEFAULT 20,
  team_pool_others NUMERIC(5,2) NOT NULL DEFAULT 20,
  default_monthly_target NUMERIC(12,2) NOT NULL DEFAULT 1000000,
  salary_cap_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_org_config UNIQUE(organization_id),
  CONSTRAINT check_pool_sum CHECK (
    team_pool_top_performer + team_pool_second_performer + team_pool_third_performer +
    team_pool_manager + team_pool_support_staff + team_pool_others = 100
  ),
  CONSTRAINT check_positive_values CHECK (
    streak_bonus_7_days >= 0 AND streak_bonus_14_days >= 0 AND streak_bonus_30_days >= 0 AND
    review_bonus_per_review >= 0 AND default_monthly_target >= 0
  )
);

-- ============================================
-- PART 5: All Indexes
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
CREATE INDEX IF NOT EXISTS idx_leads_created_via ON leads(created_via);
CREATE INDEX IF NOT EXISTS idx_leads_data_quality ON leads(data_quality_score);
CREATE INDEX IF NOT EXISTS idx_leads_review_qualified ON leads(review_qualified) WHERE review_qualified = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_review_deadline ON leads(review_deadline) WHERE status = 'win';
CREATE INDEX IF NOT EXISTS idx_leads_escalated ON leads(escalated_to_manager) WHERE status = 'lost';

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

-- streaks
CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_streaks_org ON streaks(organization_id);

-- google_reviews
CREATE INDEX IF NOT EXISTS idx_google_reviews_lead ON google_reviews(lead_id);
CREATE INDEX IF NOT EXISTS idx_google_reviews_sales_rep ON google_reviews(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_google_reviews_org ON google_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_reviews_submitted ON google_reviews(review_submitted);
CREATE INDEX IF NOT EXISTS idx_google_reviews_method ON google_reviews(method);

-- compliance_scores
CREATE INDEX IF NOT EXISTS idx_compliance_user_month ON compliance_scores(user_id, month);
CREATE INDEX IF NOT EXISTS idx_compliance_org ON compliance_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_overall ON compliance_scores(overall_score DESC);

-- offline_actions
CREATE INDEX IF NOT EXISTS idx_offline_actions_user ON offline_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_actions_synced ON offline_actions(synced) WHERE NOT synced;
CREATE INDEX IF NOT EXISTS idx_offline_actions_created ON offline_actions(created_at);

-- daily_targets
CREATE INDEX IF NOT EXISTS idx_daily_targets_user_date ON daily_targets(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_targets_org ON daily_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_targets_date ON daily_targets(date DESC);

-- commission_rates
CREATE INDEX IF NOT EXISTS idx_commission_rates_org ON commission_rates(organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_rates_category ON commission_rates(category_id);
CREATE INDEX IF NOT EXISTS idx_commission_rates_active ON commission_rates(is_active) WHERE is_active = TRUE;

-- monthly_targets
CREATE INDEX IF NOT EXISTS idx_monthly_targets_user_month ON monthly_targets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_monthly_targets_org ON monthly_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_monthly_targets_qualifies ON monthly_targets(qualifies_for_incentive) WHERE qualifies_for_incentive = TRUE;

-- penalties
CREATE INDEX IF NOT EXISTS idx_penalties_user_month ON penalties(user_id, month);
CREATE INDEX IF NOT EXISTS idx_penalties_org ON penalties(organization_id);
CREATE INDEX IF NOT EXISTS idx_penalties_status ON penalties(status);
CREATE INDEX IF NOT EXISTS idx_penalties_type ON penalties(penalty_type);

-- monthly_incentives
CREATE INDEX IF NOT EXISTS idx_monthly_incentives_user_month ON monthly_incentives(user_id, month);
CREATE INDEX IF NOT EXISTS idx_monthly_incentives_org ON monthly_incentives(organization_id);
CREATE INDEX IF NOT EXISTS idx_monthly_incentives_status ON monthly_incentives(status);
CREATE INDEX IF NOT EXISTS idx_monthly_incentives_pending ON monthly_incentives(status) WHERE status = 'pending_review';

-- team_pool_distributions
CREATE INDEX IF NOT EXISTS idx_team_pool_org_month ON team_pool_distributions(organization_id, month);
CREATE INDEX IF NOT EXISTS idx_team_pool_status ON team_pool_distributions(status);

-- ============================================
-- PART 6: Functions
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

-- Update user streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID, p_organization_id UUID)
RETURNS void AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_bridges_available INTEGER;
BEGIN
  SELECT last_activity_date, current_streak, bridges_available
  INTO v_last_activity, v_current_streak, v_bridges_available
  FROM streaks
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO streaks (user_id, organization_id, current_streak, last_activity_date)
    VALUES (p_user_id, p_organization_id, 1, CURRENT_DATE);
    RETURN;
  END IF;

  IF v_last_activity = CURRENT_DATE THEN
    RETURN;
  END IF;

  IF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE streaks
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN;
  END IF;

  IF v_last_activity = CURRENT_DATE - INTERVAL '2 days' AND v_bridges_available > 0 THEN
    UPDATE streaks
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = CURRENT_DATE,
        bridges_used = bridges_used + 1,
        bridges_available = bridges_available - 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN;
  END IF;

  UPDATE streaks
  SET current_streak = 1,
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Calculate compliance score
CREATE OR REPLACE FUNCTION calculate_compliance_score(
  p_user_id UUID,
  p_organization_id UUID,
  p_month TEXT
)
RETURNS void AS $$
DECLARE
  v_lead_score DECIMAL(5,2);
  v_review_score DECIMAL(5,2);
  v_target_score DECIMAL(5,2);
  v_streak_score DECIMAL(5,2);
  v_quality_score DECIMAL(5,2);
  v_days_in_month INTEGER;
BEGIN
  SELECT EXTRACT(DAY FROM (DATE_TRUNC('month', (p_month || '-01')::DATE) + INTERVAL '1 month - 1 day'))::INTEGER
  INTO v_days_in_month;

  SELECT LEAST(100, (COUNT(*)::DECIMAL / (5 * v_days_in_month)) * 100) INTO v_lead_score
  FROM leads
  WHERE sales_rep_id = p_user_id
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month;

  SELECT LEAST(100, (COUNT(*)::DECIMAL / (2 * v_days_in_month)) * 100) INTO v_review_score
  FROM google_reviews
  WHERE sales_rep_id = p_user_id
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month
    AND review_submitted = TRUE;

  SELECT COALESCE(AVG(overall_percentage), 0) INTO v_target_score
  FROM daily_targets
  WHERE user_id = p_user_id
    AND TO_CHAR(date, 'YYYY-MM') = p_month;

  SELECT LEAST(100, (COUNT(DISTINCT DATE(created_at))::DECIMAL / v_days_in_month) * 100) INTO v_streak_score
  FROM leads
  WHERE sales_rep_id = p_user_id
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month;

  SELECT COALESCE(AVG(data_quality_score), 100) INTO v_quality_score
  FROM leads
  WHERE sales_rep_id = p_user_id
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month;

  INSERT INTO compliance_scores (
    user_id, organization_id, month,
    lead_logging_score, review_collection_score, target_achievement_score,
    streak_score, data_quality_score
  )
  VALUES (
    p_user_id, p_organization_id, p_month,
    v_lead_score, v_review_score, v_target_score,
    v_streak_score, v_quality_score
  )
  ON CONFLICT (user_id, month) DO UPDATE SET
    lead_logging_score = v_lead_score,
    review_collection_score = v_review_score,
    target_achievement_score = v_target_score,
    streak_score = v_streak_score,
    data_quality_score = v_quality_score,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Reset weekly bridges
CREATE OR REPLACE FUNCTION reset_weekly_bridges()
RETURNS void AS $$
BEGIN
  UPDATE streaks
  SET bridges_available = 1,
      bridges_used = 0,
      last_bridge_reset = CURRENT_DATE
  WHERE last_bridge_reset < CURRENT_DATE - INTERVAL '7 days'
     OR last_bridge_reset IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Calculate commission for a sale
CREATE OR REPLACE FUNCTION calculate_sale_commission(
  p_sale_price DECIMAL,
  p_category_id UUID,
  p_organization_id UUID
)
RETURNS TABLE (
  commission_rate DECIMAL,
  multiplier_applied DECIMAL,
  effective_rate DECIMAL,
  commission_amount DECIMAL
) AS $$
DECLARE
  v_rate RECORD;
BEGIN
  SELECT
    cr.commission_percentage,
    cr.multiplier,
    cr.premium_threshold
  INTO v_rate
  FROM commission_rates cr
  WHERE cr.organization_id = p_organization_id
    AND (cr.category_id = p_category_id OR cr.category_id IS NULL)
    AND cr.is_active = TRUE
  ORDER BY cr.category_id NULLS LAST
  LIMIT 1;

  IF v_rate IS NULL THEN
    commission_rate := 0.8;
    multiplier_applied := 1.0;
    effective_rate := 0.8;
    commission_amount := p_sale_price * 0.008;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_sale_price >= v_rate.premium_threshold THEN
    commission_rate := v_rate.commission_percentage;
    multiplier_applied := v_rate.multiplier;
    effective_rate := v_rate.commission_percentage * v_rate.multiplier;
    commission_amount := p_sale_price * (v_rate.commission_percentage * v_rate.multiplier / 100);
  ELSE
    commission_rate := v_rate.commission_percentage;
    multiplier_applied := 1.0;
    effective_rate := v_rate.commission_percentage;
    commission_amount := p_sale_price * (v_rate.commission_percentage / 100);
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Calculate streak bonus
CREATE OR REPLACE FUNCTION calculate_streak_bonus(
  p_user_id UUID,
  p_month TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_current_streak INTEGER;
  v_bonus DECIMAL := 0;
BEGIN
  SELECT current_streak INTO v_current_streak
  FROM streaks
  WHERE user_id = p_user_id;

  IF v_current_streak IS NULL THEN
    RETURN 0;
  END IF;

  IF v_current_streak >= 30 THEN
    v_bonus := 700;
  ELSIF v_current_streak >= 14 THEN
    v_bonus := 150;
  ELSIF v_current_streak >= 7 THEN
    v_bonus := 50;
  END IF;

  RETURN v_bonus;
END;
$$ LANGUAGE plpgsql;

-- Calculate review bonus
CREATE OR REPLACE FUNCTION calculate_review_bonus(
  p_user_id UUID,
  p_month TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_review_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_review_count
  FROM google_reviews
  WHERE sales_rep_id = p_user_id
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month
    AND review_link_sent_at IS NOT NULL;

  RETURN v_review_count * 10;
END;
$$ LANGUAGE plpgsql;

-- Calculate penalty percentage
CREATE OR REPLACE FUNCTION calculate_penalty_percentage(
  p_user_id UUID,
  p_month TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_penalty DECIMAL := 0;
BEGIN
  SELECT COALESCE(SUM(penalty_percentage), 0) INTO v_total_penalty
  FROM penalties
  WHERE user_id = p_user_id
    AND month = p_month
    AND status = 'active';

  RETURN LEAST(v_total_penalty, 100);
END;
$$ LANGUAGE plpgsql;

-- Calculate monthly incentive
CREATE OR REPLACE FUNCTION calculate_monthly_incentive(
  p_user_id UUID,
  p_month TEXT
)
RETURNS void AS $$
DECLARE
  v_org_id UUID;
  v_salary DECIMAL;
  v_gross_commission DECIMAL := 0;
  v_streak_bonus DECIMAL := 0;
  v_review_bonus DECIMAL := 0;
  v_gross_total DECIMAL := 0;
  v_penalty_pct DECIMAL := 0;
  v_penalty_amount DECIMAL := 0;
  v_penalty_count INTEGER := 0;
  v_net_incentive DECIMAL := 0;
  v_capped_amount DECIMAL;
  v_salary_cap_applied BOOLEAN := FALSE;
  v_qualifies BOOLEAN := FALSE;
BEGIN
  SELECT organization_id, monthly_salary INTO v_org_id, v_salary
  FROM users
  WHERE id = p_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User not found or has no organization';
  END IF;

  SELECT qualifies_for_incentive INTO v_qualifies
  FROM monthly_targets
  WHERE user_id = p_user_id AND month = p_month;

  SELECT COALESCE(SUM(commission_amount), 0) INTO v_gross_commission
  FROM leads
  WHERE sales_rep_id = p_user_id
    AND status = 'win'
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month
    AND (review_qualified = TRUE OR review_qualified IS NULL);

  v_streak_bonus := calculate_streak_bonus(p_user_id, p_month);
  v_review_bonus := calculate_review_bonus(p_user_id, p_month);

  v_gross_total := v_gross_commission + v_streak_bonus + v_review_bonus;

  SELECT COALESCE(SUM(penalty_percentage), 0), COUNT(*)
  INTO v_penalty_pct, v_penalty_count
  FROM penalties
  WHERE user_id = p_user_id
    AND month = p_month
    AND status = 'active';

  v_penalty_pct := LEAST(v_penalty_pct, 100);
  v_penalty_amount := v_gross_total * (v_penalty_pct / 100);

  IF v_qualifies = TRUE OR v_qualifies IS NULL THEN
    v_net_incentive := v_gross_total - v_penalty_amount;
  ELSE
    v_net_incentive := 0;
  END IF;

  v_capped_amount := v_net_incentive;
  IF v_salary IS NOT NULL AND v_net_incentive > v_salary THEN
    v_capped_amount := v_salary;
    v_salary_cap_applied := TRUE;
  END IF;

  INSERT INTO monthly_incentives (
    user_id, organization_id, month,
    gross_commission, streak_bonus, review_bonus,
    penalty_count, penalty_percentage, penalty_amount,
    net_incentive, user_monthly_salary, salary_cap_applied, capped_amount,
    status
  )
  VALUES (
    p_user_id, v_org_id, p_month,
    v_gross_commission, v_streak_bonus, v_review_bonus,
    v_penalty_count, v_penalty_pct, v_penalty_amount,
    v_net_incentive, v_salary, v_salary_cap_applied, v_capped_amount,
    'calculating'
  )
  ON CONFLICT (user_id, month) DO UPDATE SET
    gross_commission = v_gross_commission,
    streak_bonus = v_streak_bonus,
    review_bonus = v_review_bonus,
    penalty_count = v_penalty_count,
    penalty_percentage = v_penalty_pct,
    penalty_amount = v_penalty_amount,
    net_incentive = v_net_incentive,
    user_monthly_salary = v_salary,
    salary_cap_applied = v_salary_cap_applied,
    capped_amount = v_capped_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Check review qualification trigger function
CREATE OR REPLACE FUNCTION check_review_qualification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.review_received_at IS NOT NULL AND OLD.review_received_at IS NULL THEN
    IF NEW.review_deadline IS NOT NULL AND NEW.review_received_at <= NEW.review_deadline THEN
      NEW.review_qualified := TRUE;
    ELSE
      NEW.review_qualified := FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set review deadline on lead creation
CREATE OR REPLACE FUNCTION set_review_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'win' THEN
    NEW.review_deadline := NEW.created_at + INTERVAL '8 days';
    NEW.review_sent_at := NEW.created_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate commission on lead insert/update
CREATE OR REPLACE FUNCTION calculate_lead_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
BEGIN
  IF NEW.status = 'win' AND NEW.sale_price IS NOT NULL THEN
    SELECT * INTO v_result
    FROM calculate_sale_commission(NEW.sale_price, NEW.category_id, NEW.organization_id);
    NEW.commission_rate_applied := v_result.effective_rate;
    NEW.commission_amount := v_result.commission_amount;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Seed commission rates from actual categories in the organization
CREATE OR REPLACE FUNCTION seed_default_commission_rates(p_organization_id UUID)
RETURNS void AS $$
BEGIN
  -- Create a commission rate for each actual category in the org
  INSERT INTO commission_rates (organization_id, category_name, category_id, commission_percentage, multiplier, premium_threshold)
  SELECT
    p_organization_id,
    c.name,
    c.id,
    CASE
      WHEN c.name IN ('Electric', 'Premium Geared') THEN 0.7
      WHEN c.name = 'Kids' THEN 1.0
      ELSE 0.8
    END,
    CASE
      WHEN c.name IN ('Electric', 'Premium Geared') THEN 1.5
      ELSE 1.0
    END,
    50000
  FROM categories c
  WHERE c.organization_id = p_organization_id
  ON CONFLICT (organization_id, category_name) DO NOTHING;

  -- Always add a Default fallback rate
  INSERT INTO commission_rates (organization_id, category_name, commission_percentage, multiplier, premium_threshold)
  VALUES (p_organization_id, 'Default', 0.8, 1.0, 50000)
  ON CONFLICT (organization_id, category_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Incentive config timestamp
CREATE OR REPLACE FUNCTION update_incentive_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 7: Triggers
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

DROP TRIGGER IF EXISTS update_streaks_updated_at ON streaks;
CREATE TRIGGER update_streaks_updated_at
BEFORE UPDATE ON streaks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_compliance_scores_updated_at ON compliance_scores;
CREATE TRIGGER update_compliance_scores_updated_at
BEFORE UPDATE ON compliance_scores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_targets_updated_at ON daily_targets;
CREATE TRIGGER update_daily_targets_updated_at
BEFORE UPDATE ON daily_targets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_commission_rates_updated_at ON commission_rates;
CREATE TRIGGER update_commission_rates_updated_at
BEFORE UPDATE ON commission_rates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_targets_updated_at ON monthly_targets;
CREATE TRIGGER update_monthly_targets_updated_at
BEFORE UPDATE ON monthly_targets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_penalties_updated_at ON penalties;
CREATE TRIGGER update_penalties_updated_at
BEFORE UPDATE ON penalties
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_incentives_updated_at ON monthly_incentives;
CREATE TRIGGER update_monthly_incentives_updated_at
BEFORE UPDATE ON monthly_incentives
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_pool_distributions_updated_at ON team_pool_distributions;
CREATE TRIGGER update_team_pool_distributions_updated_at
BEFORE UPDATE ON team_pool_distributions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_incentive_config_updated_at ON organization_incentive_config;
CREATE TRIGGER trigger_incentive_config_updated_at
BEFORE UPDATE ON organization_incentive_config
FOR EACH ROW EXECUTE FUNCTION update_incentive_config_timestamp();

-- Lead triggers for incentive system
DROP TRIGGER IF EXISTS check_lead_review_qualification ON leads;
CREATE TRIGGER check_lead_review_qualification
  BEFORE UPDATE ON leads
  FOR EACH ROW
  WHEN (NEW.review_received_at IS DISTINCT FROM OLD.review_received_at)
  EXECUTE FUNCTION check_review_qualification();

DROP TRIGGER IF EXISTS set_lead_review_deadline ON leads;
CREATE TRIGGER set_lead_review_deadline
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_review_deadline();

DROP TRIGGER IF EXISTS calculate_lead_commission_trigger ON leads;
CREATE TRIGGER calculate_lead_commission_trigger
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  WHEN (NEW.status = 'win' AND NEW.sale_price IS NOT NULL)
  EXECUTE FUNCTION calculate_lead_commission();

-- ============================================
-- PART 8: Default Data
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
-- PART 9: Table Comments
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
COMMENT ON TABLE streaks IS 'Track user activity streaks for gamification';
COMMENT ON TABLE google_reviews IS 'Track Google Review collection via NFC/QR';
COMMENT ON TABLE compliance_scores IS 'Monthly compliance scores for sales reps';
COMMENT ON TABLE offline_actions IS 'Queue for offline actions awaiting sync';
COMMENT ON TABLE daily_targets IS 'Daily targets and achievements for sales reps';
COMMENT ON TABLE commission_rates IS 'Category-based commission percentages for 2XG Earn';
COMMENT ON TABLE monthly_targets IS 'Monthly sales targets for incentive qualification';
COMMENT ON TABLE penalties IS 'Penalty events that reduce incentive amounts';
COMMENT ON TABLE monthly_incentives IS 'Final monthly incentive calculations and approval status';
COMMENT ON TABLE team_pool_distributions IS 'Monthly team pool distributions';
COMMENT ON TABLE organization_incentive_config IS 'Configurable incentive parameters per organization';

-- ================================================================
-- MIGRATION COMPLETE!
--
-- Tables created: 22
-- Functions created: 16
-- Triggers created: 16
-- Default data: role_permissions, system_settings
--
-- Next: Update your .env.local with the Supabase connection string
-- ================================================================
