-- ================================================
-- 2XG EARN INCENTIVE SYSTEM - DATABASE MIGRATION
-- Date: 2026-02-04
-- Purpose: Core incentive calculation tables and fields
-- ================================================

-- ================================================
-- PART 1: CREATE NEW TABLES
-- ================================================

-- 1.1 COMMISSION_RATES TABLE
-- Category-based commission percentages
CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  category_name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Commission percentage (e.g., 1.0 = 1%)
  commission_percentage DECIMAL(5,3) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),

  -- Multiplier for premium sales (e.g., 1.5 for premium)
  multiplier DECIMAL(4,2) DEFAULT 1.0 CHECK (multiplier >= 1.0 AND multiplier <= 10.0),

  -- Minimum sale price to qualify for commission
  min_sale_price DECIMAL(12,2) DEFAULT 0,

  -- Threshold above which premium multiplier applies
  premium_threshold DECIMAL(12,2) DEFAULT 50000,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, category_name)
);

CREATE INDEX IF NOT EXISTS idx_commission_rates_org ON commission_rates(organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_rates_category ON commission_rates(category_id);
CREATE INDEX IF NOT EXISTS idx_commission_rates_active ON commission_rates(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE commission_rates IS 'Category-based commission percentages for 2XG Earn';
COMMENT ON COLUMN commission_rates.commission_percentage IS 'Base commission rate (e.g., 1.0 = 1%)';
COMMENT ON COLUMN commission_rates.multiplier IS 'Multiplier for premium sales above threshold';
COMMENT ON COLUMN commission_rates.premium_threshold IS 'Sale price above which premium multiplier applies (default 50000)';

-- 1.2 MONTHLY_TARGETS TABLE
-- User monthly sales targets
CREATE TABLE IF NOT EXISTS monthly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  month TEXT NOT NULL, -- Format: 'YYYY-MM' (e.g., '2026-02')

  -- Target amounts
  target_amount DECIMAL(12,2) NOT NULL DEFAULT 1000000, -- Default 10L
  achieved_amount DECIMAL(12,2) DEFAULT 0,

  -- Achievement calculation
  achievement_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN target_amount > 0
    THEN LEAST(200, (achieved_amount / target_amount * 100))
    ELSE 0 END
  ) STORED,

  -- Qualification status
  qualifies_for_incentive BOOLEAN GENERATED ALWAYS AS (
    achieved_amount >= target_amount
  ) STORED,

  -- Target set by
  set_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_targets_user_month ON monthly_targets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_monthly_targets_org ON monthly_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_monthly_targets_qualifies ON monthly_targets(qualifies_for_incentive) WHERE qualifies_for_incentive = TRUE;

COMMENT ON TABLE monthly_targets IS 'Monthly sales targets for incentive qualification';
COMMENT ON COLUMN monthly_targets.target_amount IS 'Minimum sales required (default 10L = 1000000)';
COMMENT ON COLUMN monthly_targets.qualifies_for_incentive IS 'TRUE if achieved >= target';

-- 1.3 PENALTY_TYPES ENUM
DO $$ BEGIN
  CREATE TYPE penalty_type AS ENUM (
    'late_arrival',           -- -5% per instance
    'unauthorized_absence',   -- -10% per instance
    'back_to_back_offs',     -- -10% per instance
    'low_compliance',         -- Based on compliance score
    'high_error_rate',        -- Based on error rate
    'non_escalated_lost_lead', -- -10% per instance
    'missing_documentation',  -- -10% per instance
    'low_team_eval',          -- Based on team evaluation score
    'client_disrespect'       -- -100% (full forfeiture)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1.4 PENALTIES TABLE
-- Individual penalty events
CREATE TABLE IF NOT EXISTS penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  month TEXT NOT NULL, -- Format: 'YYYY-MM'

  penalty_type TEXT NOT NULL CHECK (penalty_type IN (
    'late_arrival',
    'unauthorized_absence',
    'back_to_back_offs',
    'low_compliance',
    'high_error_rate',
    'non_escalated_lost_lead',
    'missing_documentation',
    'low_team_eval',
    'client_disrespect'
  )),

  -- Penalty percentage (5-100%)
  penalty_percentage DECIMAL(5,2) NOT NULL CHECK (penalty_percentage >= 0 AND penalty_percentage <= 100),

  -- Details
  description TEXT,
  incident_date DATE,
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Status workflow
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disputed', 'resolved', 'waived')),
  disputed_at TIMESTAMPTZ,
  dispute_reason TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- Created by (manager who applied penalty)
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_penalties_user_month ON penalties(user_id, month);
CREATE INDEX IF NOT EXISTS idx_penalties_org ON penalties(organization_id);
CREATE INDEX IF NOT EXISTS idx_penalties_status ON penalties(status);
CREATE INDEX IF NOT EXISTS idx_penalties_type ON penalties(penalty_type);

COMMENT ON TABLE penalties IS 'Penalty events that reduce incentive amounts';
COMMENT ON COLUMN penalties.penalty_percentage IS 'Percentage deduction (e.g., 5 = 5% deduction)';

-- 1.5 INCENTIVE_STATUS ENUM
DO $$ BEGIN
  CREATE TYPE incentive_status AS ENUM (
    'calculating',     -- System is calculating
    'pending_review',  -- Awaiting manager review
    'approved',        -- Manager approved
    'paid',           -- Payment processed
    'rejected'        -- Rejected by manager
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1.6 MONTHLY_INCENTIVES TABLE
-- Final monthly incentive calculations
CREATE TABLE IF NOT EXISTS monthly_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  month TEXT NOT NULL, -- Format: 'YYYY-MM'

  -- Gross amounts
  gross_commission DECIMAL(12,2) DEFAULT 0,
  streak_bonus DECIMAL(10,2) DEFAULT 0,
  review_bonus DECIMAL(10,2) DEFAULT 0,
  total_bonuses DECIMAL(10,2) GENERATED ALWAYS AS (streak_bonus + review_bonus) STORED,

  -- Deductions
  penalty_count INTEGER DEFAULT 0,
  penalty_percentage DECIMAL(5,2) DEFAULT 0, -- Total penalty %
  penalty_amount DECIMAL(12,2) DEFAULT 0,

  -- Net calculation
  gross_total DECIMAL(12,2) GENERATED ALWAYS AS (gross_commission + streak_bonus + review_bonus) STORED,
  net_incentive DECIMAL(12,2) DEFAULT 0, -- After penalties

  -- Salary cap check
  user_monthly_salary DECIMAL(12,2),
  salary_cap_applied BOOLEAN DEFAULT FALSE,
  capped_amount DECIMAL(12,2), -- Amount after cap

  -- Final amount
  final_approved_amount DECIMAL(12,2),

  -- Status workflow
  status TEXT DEFAULT 'calculating' CHECK (status IN ('calculating', 'pending_review', 'approved', 'paid', 'rejected')),

  -- Approval workflow
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Payment tracking
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,

  -- Breakdown JSON for detailed display
  breakdown_json JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_incentives_user_month ON monthly_incentives(user_id, month);
CREATE INDEX IF NOT EXISTS idx_monthly_incentives_org ON monthly_incentives(organization_id);
CREATE INDEX IF NOT EXISTS idx_monthly_incentives_status ON monthly_incentives(status);
CREATE INDEX IF NOT EXISTS idx_monthly_incentives_pending ON monthly_incentives(status) WHERE status = 'pending_review';

COMMENT ON TABLE monthly_incentives IS 'Final monthly incentive calculations and approval status';
COMMENT ON COLUMN monthly_incentives.salary_cap_applied IS 'TRUE if incentive was capped at monthly salary';
COMMENT ON COLUMN monthly_incentives.breakdown_json IS 'Detailed breakdown for UI display';

-- 1.7 TEAM_POOL_DISTRIBUTIONS TABLE
-- Team pool allocation (monthly)
CREATE TABLE IF NOT EXISTS team_pool_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  month TEXT NOT NULL, -- Format: 'YYYY-MM'

  -- Pool amounts
  total_pool_amount DECIMAL(12,2) NOT NULL,

  -- Distribution breakdown
  top_performer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  top_performer_amount DECIMAL(12,2), -- 20%

  second_performer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  second_performer_amount DECIMAL(12,2), -- 12%

  third_performer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  third_performer_amount DECIMAL(12,2), -- 8%

  manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  manager_amount DECIMAL(12,2), -- 20%

  support_staff_amount DECIMAL(12,2), -- 20%
  others_pool_amount DECIMAL(12,2), -- 20%

  -- Status
  status TEXT DEFAULT 'calculating' CHECK (status IN ('calculating', 'pending_approval', 'approved', 'distributed')),

  -- Approval
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  -- Distribution tracking
  distributed_at TIMESTAMPTZ,
  distribution_notes TEXT,

  -- Full breakdown
  distribution_json JSONB, -- Detailed per-person breakdown

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, month)
);

CREATE INDEX IF NOT EXISTS idx_team_pool_org_month ON team_pool_distributions(organization_id, month);
CREATE INDEX IF NOT EXISTS idx_team_pool_status ON team_pool_distributions(status);

COMMENT ON TABLE team_pool_distributions IS 'Monthly team pool distributions';
COMMENT ON COLUMN team_pool_distributions.total_pool_amount IS 'Total pool to be distributed among team';

-- ================================================
-- PART 2: MODIFY EXISTING TABLES
-- ================================================

-- 2.1 UPDATE USERS TABLE
-- Add salary and evaluation fields
ALTER TABLE users
ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(12,2);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS team_eval_score DECIMAL(3,1) CHECK (team_eval_score IS NULL OR (team_eval_score >= 0 AND team_eval_score <= 5));

ALTER TABLE users
ADD COLUMN IF NOT EXISTS staff_type TEXT DEFAULT 'sales' CHECK (staff_type IN ('sales', 'support', 'manager', 'admin'));

COMMENT ON COLUMN users.monthly_salary IS 'Monthly salary for incentive cap calculation';
COMMENT ON COLUMN users.team_eval_score IS 'Team evaluation score (0-5, target 4.0)';
COMMENT ON COLUMN users.staff_type IS 'Staff type for pool distribution: sales, support, manager, admin';

-- 2.2 UPDATE LEADS TABLE
-- Add review tracking and commission fields
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS review_sent_at TIMESTAMPTZ;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS review_received_at TIMESTAMPTZ;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS review_deadline TIMESTAMPTZ;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS review_qualified BOOLEAN DEFAULT NULL;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS escalated_to_manager BOOLEAN DEFAULT FALSE;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS commission_rate_applied DECIMAL(5,3);

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2);

COMMENT ON COLUMN leads.review_sent_at IS 'When review request was sent to customer';
COMMENT ON COLUMN leads.review_received_at IS 'When customer submitted review';
COMMENT ON COLUMN leads.review_deadline IS 'Deadline for review (created_at + 8 days)';
COMMENT ON COLUMN leads.review_qualified IS 'TRUE if review received within deadline';
COMMENT ON COLUMN leads.escalated_to_manager IS 'Whether lost lead was escalated to manager';
COMMENT ON COLUMN leads.commission_rate_applied IS 'Commission rate used for this sale';
COMMENT ON COLUMN leads.commission_amount IS 'Commission amount calculated for this sale';

CREATE INDEX IF NOT EXISTS idx_leads_review_qualified ON leads(review_qualified) WHERE review_qualified = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_review_deadline ON leads(review_deadline) WHERE status = 'win';
CREATE INDEX IF NOT EXISTS idx_leads_escalated ON leads(escalated_to_manager) WHERE status = 'lost';

-- ================================================
-- PART 3: CREATE HELPER FUNCTIONS
-- ================================================

-- 3.1 FUNCTION: Calculate commission for a sale
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
  -- Get commission rate for category
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

  -- If no rate found, use default 0.8%
  IF v_rate IS NULL THEN
    commission_rate := 0.8;
    multiplier_applied := 1.0;
    effective_rate := 0.8;
    commission_amount := p_sale_price * 0.008;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check if premium multiplier applies
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

COMMENT ON FUNCTION calculate_sale_commission IS 'Calculate commission for a sale based on category rates';

-- 3.2 FUNCTION: Calculate streak bonus
CREATE OR REPLACE FUNCTION calculate_streak_bonus(
  p_user_id UUID,
  p_month TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_current_streak INTEGER;
  v_bonus DECIMAL := 0;
BEGIN
  -- Get current streak for user
  SELECT current_streak INTO v_current_streak
  FROM streaks
  WHERE user_id = p_user_id;

  IF v_current_streak IS NULL THEN
    RETURN 0;
  END IF;

  -- Cumulative bonuses: 7 days = 50, 14 days = 150, 30 days = 700
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

COMMENT ON FUNCTION calculate_streak_bonus IS 'Calculate streak bonus: 7d=50, 14d=150, 30d=700 (cumulative)';

-- 3.3 FUNCTION: Calculate review bonus
CREATE OR REPLACE FUNCTION calculate_review_bonus(
  p_user_id UUID,
  p_month TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_review_count INTEGER;
BEGIN
  -- Count reviews initiated this month
  SELECT COUNT(*) INTO v_review_count
  FROM google_reviews
  WHERE sales_rep_id = p_user_id
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month
    AND review_link_sent_at IS NOT NULL;

  -- 10 per review initiated
  RETURN v_review_count * 10;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_review_bonus IS 'Calculate review bonus: 10 per review initiated';

-- 3.4 FUNCTION: Calculate total penalties percentage
CREATE OR REPLACE FUNCTION calculate_penalty_percentage(
  p_user_id UUID,
  p_month TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_penalty DECIMAL := 0;
BEGIN
  -- Sum all active penalties for the month
  SELECT COALESCE(SUM(penalty_percentage), 0) INTO v_total_penalty
  FROM penalties
  WHERE user_id = p_user_id
    AND month = p_month
    AND status = 'active';

  -- Cap at 100%
  RETURN LEAST(v_total_penalty, 100);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_penalty_percentage IS 'Calculate total penalty percentage for a user-month';

-- 3.5 FUNCTION: Calculate monthly incentive
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
  -- Get user info
  SELECT organization_id, monthly_salary INTO v_org_id, v_salary
  FROM users
  WHERE id = p_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User not found or has no organization';
  END IF;

  -- Check if user qualifies (met monthly target)
  SELECT qualifies_for_incentive INTO v_qualifies
  FROM monthly_targets
  WHERE user_id = p_user_id AND month = p_month;

  -- Calculate gross commission from qualified sales
  SELECT COALESCE(SUM(commission_amount), 0) INTO v_gross_commission
  FROM leads
  WHERE sales_rep_id = p_user_id
    AND status = 'win'
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month
    AND (review_qualified = TRUE OR review_qualified IS NULL); -- Include if qualified or not yet checked

  -- Calculate bonuses
  v_streak_bonus := calculate_streak_bonus(p_user_id, p_month);
  v_review_bonus := calculate_review_bonus(p_user_id, p_month);

  -- Calculate gross total
  v_gross_total := v_gross_commission + v_streak_bonus + v_review_bonus;

  -- Calculate penalties
  SELECT COALESCE(SUM(penalty_percentage), 0), COUNT(*)
  INTO v_penalty_pct, v_penalty_count
  FROM penalties
  WHERE user_id = p_user_id
    AND month = p_month
    AND status = 'active';

  v_penalty_pct := LEAST(v_penalty_pct, 100);
  v_penalty_amount := v_gross_total * (v_penalty_pct / 100);

  -- Calculate net incentive
  IF v_qualifies = TRUE OR v_qualifies IS NULL THEN
    v_net_incentive := v_gross_total - v_penalty_amount;
  ELSE
    v_net_incentive := 0; -- Didn't meet target
  END IF;

  -- Apply salary cap
  v_capped_amount := v_net_incentive;
  IF v_salary IS NOT NULL AND v_net_incentive > v_salary THEN
    v_capped_amount := v_salary;
    v_salary_cap_applied := TRUE;
  END IF;

  -- Upsert monthly incentive
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

COMMENT ON FUNCTION calculate_monthly_incentive IS 'Calculate complete monthly incentive for a user';

-- 3.6 FUNCTION: Update review qualification
CREATE OR REPLACE FUNCTION check_review_qualification()
RETURNS TRIGGER AS $$
BEGIN
  -- When review_received_at is set, check if within deadline
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

DROP TRIGGER IF EXISTS check_lead_review_qualification ON leads;
CREATE TRIGGER check_lead_review_qualification
  BEFORE UPDATE ON leads
  FOR EACH ROW
  WHEN (NEW.review_received_at IS DISTINCT FROM OLD.review_received_at)
  EXECUTE FUNCTION check_review_qualification();

COMMENT ON FUNCTION check_review_qualification IS 'Auto-check review qualification when review_received_at is set';

-- 3.7 FUNCTION: Set review deadline on lead creation
CREATE OR REPLACE FUNCTION set_review_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- For win leads, set review deadline to 8 days from creation
  IF NEW.status = 'win' THEN
    NEW.review_deadline := NEW.created_at + INTERVAL '8 days';
    NEW.review_sent_at := NEW.created_at; -- Assume review request sent immediately
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_lead_review_deadline ON leads;
CREATE TRIGGER set_lead_review_deadline
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_review_deadline();

COMMENT ON FUNCTION set_review_deadline IS 'Auto-set review deadline to 8 days for win leads';

-- 3.8 FUNCTION: Calculate commission on lead insert/update
CREATE OR REPLACE FUNCTION calculate_lead_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Only for win leads with sale price
  IF NEW.status = 'win' AND NEW.sale_price IS NOT NULL THEN
    SELECT * INTO v_result
    FROM calculate_sale_commission(NEW.sale_price, NEW.category_id, NEW.organization_id);

    NEW.commission_rate_applied := v_result.effective_rate;
    NEW.commission_amount := v_result.commission_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_lead_commission_trigger ON leads;
CREATE TRIGGER calculate_lead_commission_trigger
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  WHEN (NEW.status = 'win' AND NEW.sale_price IS NOT NULL)
  EXECUTE FUNCTION calculate_lead_commission();

COMMENT ON FUNCTION calculate_lead_commission IS 'Auto-calculate commission when win lead created/updated';

-- ================================================
-- PART 4: ROW LEVEL SECURITY POLICIES
-- ================================================

-- 4.1 COMMISSION_RATES POLICIES
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org commission rates" ON commission_rates;
CREATE POLICY "Users can view their org commission rates"
ON commission_rates FOR SELECT
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can manage commission rates" ON commission_rates;
CREATE POLICY "Managers can manage commission rates"
ON commission_rates FOR ALL
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'super_admin')
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'super_admin')
);

-- 4.2 MONTHLY_TARGETS POLICIES
ALTER TABLE monthly_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their targets" ON monthly_targets;
CREATE POLICY "Users can view their targets"
ON monthly_targets FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'super_admin')
);

DROP POLICY IF EXISTS "Managers can manage targets" ON monthly_targets;
CREATE POLICY "Managers can manage targets"
ON monthly_targets FOR ALL
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'super_admin')
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'super_admin')
);

-- 4.3 PENALTIES POLICIES
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their penalties" ON penalties;
CREATE POLICY "Users can view their penalties"
ON penalties FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'super_admin')
);

DROP POLICY IF EXISTS "Managers can manage penalties" ON penalties;
CREATE POLICY "Managers can manage penalties"
ON penalties FOR ALL
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'super_admin')
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'super_admin')
);

DROP POLICY IF EXISTS "Users can dispute their penalties" ON penalties;
CREATE POLICY "Users can dispute their penalties"
ON penalties FOR UPDATE
USING (user_id = auth.uid() AND status = 'active')
WITH CHECK (status = 'disputed');

-- 4.4 MONTHLY_INCENTIVES POLICIES
ALTER TABLE monthly_incentives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their incentives" ON monthly_incentives;
CREATE POLICY "Users can view their incentives"
ON monthly_incentives FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'super_admin')
);

DROP POLICY IF EXISTS "System can manage incentives" ON monthly_incentives;
CREATE POLICY "System can manage incentives"
ON monthly_incentives FOR ALL
USING (true)
WITH CHECK (true);

-- 4.5 TEAM_POOL_DISTRIBUTIONS POLICIES
ALTER TABLE team_pool_distributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org team pool" ON team_pool_distributions;
CREATE POLICY "Users can view their org team pool"
ON team_pool_distributions FOR SELECT
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can manage team pool" ON team_pool_distributions;
CREATE POLICY "Managers can manage team pool"
ON team_pool_distributions FOR ALL
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'super_admin')
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'super_admin')
);

-- ================================================
-- PART 5: SEED DEFAULT COMMISSION RATES
-- ================================================

-- Dynamically creates commission rates from actual categories in the organization.
-- Electric & Premium Geared: 0.7% with 1.5x premium multiplier
-- Kids: 1.0%
-- All others: 0.8% (default)
-- Also creates a "Default" fallback rate for any unmatched categories.

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

COMMENT ON FUNCTION seed_default_commission_rates IS 'Seed commission rates from actual org categories';

-- ================================================
-- PART 6: UPDATE TRIGGERS
-- ================================================

-- 6.1 Auto-update updated_at columns
DROP TRIGGER IF EXISTS update_commission_rates_updated_at ON commission_rates;
CREATE TRIGGER update_commission_rates_updated_at
  BEFORE UPDATE ON commission_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_targets_updated_at ON monthly_targets;
CREATE TRIGGER update_monthly_targets_updated_at
  BEFORE UPDATE ON monthly_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_penalties_updated_at ON penalties;
CREATE TRIGGER update_penalties_updated_at
  BEFORE UPDATE ON penalties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_incentives_updated_at ON monthly_incentives;
CREATE TRIGGER update_monthly_incentives_updated_at
  BEFORE UPDATE ON monthly_incentives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_pool_distributions_updated_at ON team_pool_distributions;
CREATE TRIGGER update_team_pool_distributions_updated_at
  BEFORE UPDATE ON team_pool_distributions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Count new tables
SELECT
  'commission_rates' as table_name,
  COUNT(*) as row_count
FROM commission_rates
UNION ALL
SELECT 'monthly_targets', COUNT(*) FROM monthly_targets
UNION ALL
SELECT 'penalties', COUNT(*) FROM penalties
UNION ALL
SELECT 'monthly_incentives', COUNT(*) FROM monthly_incentives
UNION ALL
SELECT 'team_pool_distributions', COUNT(*) FROM team_pool_distributions;

-- Verify new columns on users
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('monthly_salary', 'team_eval_score', 'staff_type');

-- Verify new columns on leads
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('review_sent_at', 'review_received_at', 'review_deadline', 'review_qualified', 'escalated_to_manager', 'commission_rate_applied', 'commission_amount');

-- ================================================
-- END OF MIGRATION
-- Run this SQL file in Supabase SQL Editor
-- After running, execute: NOTIFY pgrst, 'reload schema';
-- ================================================
