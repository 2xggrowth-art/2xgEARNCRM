-- Migration: Organization Incentive Configuration
-- Makes all incentive parameters configurable per organization

CREATE TABLE IF NOT EXISTS organization_incentive_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Streak Bonuses
  streak_bonus_7_days NUMERIC(10,2) NOT NULL DEFAULT 50,
  streak_bonus_14_days NUMERIC(10,2) NOT NULL DEFAULT 150,
  streak_bonus_30_days NUMERIC(10,2) NOT NULL DEFAULT 700,

  -- Review Bonus
  review_bonus_per_review NUMERIC(10,2) NOT NULL DEFAULT 10,

  -- Penalty Percentages
  penalty_late_arrival NUMERIC(5,2) NOT NULL DEFAULT 5,
  penalty_unauthorized_absence NUMERIC(5,2) NOT NULL DEFAULT 10,
  penalty_back_to_back_offs NUMERIC(5,2) NOT NULL DEFAULT 10,
  penalty_low_compliance NUMERIC(5,2) NOT NULL DEFAULT 10,
  penalty_high_error_rate NUMERIC(5,2) NOT NULL DEFAULT 10,
  penalty_non_escalated_lost_lead NUMERIC(5,2) NOT NULL DEFAULT 10,
  penalty_missing_documentation NUMERIC(5,2) NOT NULL DEFAULT 10,
  penalty_low_team_eval NUMERIC(5,2) NOT NULL DEFAULT 15,
  penalty_client_disrespect NUMERIC(5,2) NOT NULL DEFAULT 100,

  -- Penalty Thresholds
  compliance_threshold NUMERIC(5,2) NOT NULL DEFAULT 96,
  error_rate_threshold NUMERIC(5,2) NOT NULL DEFAULT 1,
  team_eval_threshold NUMERIC(3,1) NOT NULL DEFAULT 4.0,

  -- Team Pool Distribution
  team_pool_top_performer NUMERIC(5,2) NOT NULL DEFAULT 20,
  team_pool_second_performer NUMERIC(5,2) NOT NULL DEFAULT 12,
  team_pool_third_performer NUMERIC(5,2) NOT NULL DEFAULT 8,
  team_pool_manager NUMERIC(5,2) NOT NULL DEFAULT 20,
  team_pool_support_staff NUMERIC(5,2) NOT NULL DEFAULT 20,
  team_pool_others NUMERIC(5,2) NOT NULL DEFAULT 20,

  -- Target & Cap
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

-- Seed config for all existing orgs
INSERT INTO organization_incentive_config (organization_id)
SELECT id FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- Auto update timestamp
CREATE OR REPLACE FUNCTION update_incentive_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_incentive_config_updated_at
  BEFORE UPDATE ON organization_incentive_config
  FOR EACH ROW
  EXECUTE FUNCTION update_incentive_config_timestamp();
