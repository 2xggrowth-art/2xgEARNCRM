-- ================================================
-- 2XG EARN INTEGRATION - DATABASE MIGRATION
-- Date: 2026-02-03
-- Purpose: Add tables and columns for 2XG Earn features
-- ================================================

-- ================================================
-- PART 1: CREATE NEW TABLES
-- ================================================

-- 1.1 STREAKS TABLE
-- Track daily activity streaks for gamification
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,

  -- Bridges (miss a day but keep streak)
  bridges_available INTEGER DEFAULT 1,
  bridges_used INTEGER DEFAULT 0,
  last_bridge_reset DATE DEFAULT CURRENT_DATE,

  -- Milestones
  weekly_streaks INTEGER DEFAULT 0,
  monthly_streaks INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_streaks_org ON streaks(organization_id);

COMMENT ON TABLE streaks IS 'Track user activity streaks for gamification';
COMMENT ON COLUMN streaks.bridges_available IS 'Number of streak bridges (free misses) available';
COMMENT ON COLUMN streaks.bridges_used IS 'Number of bridges used this week';

-- 1.2 GOOGLE REVIEWS TABLE
-- Track Google Review collection attempts and completions
CREATE TABLE IF NOT EXISTS google_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sales_rep_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  customer_name TEXT,
  customer_phone TEXT,

  -- Review collection
  method TEXT CHECK (method IN ('nfc', 'qr', 'sms', 'whatsapp')),
  review_link_sent_at TIMESTAMPTZ,

  -- Google API data
  google_place_id TEXT,
  review_submitted BOOLEAN DEFAULT FALSE,
  review_rating INTEGER CHECK (review_rating BETWEEN 1 AND 5),
  review_text TEXT,
  review_submitted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_reviews_lead ON google_reviews(lead_id);
CREATE INDEX IF NOT EXISTS idx_google_reviews_sales_rep ON google_reviews(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_google_reviews_org ON google_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_reviews_submitted ON google_reviews(review_submitted);
CREATE INDEX IF NOT EXISTS idx_google_reviews_method ON google_reviews(method);

COMMENT ON TABLE google_reviews IS 'Track Google Review collection via NFC/QR';

-- 1.3 COMPLIANCE SCORES TABLE
-- Track 5-component compliance metrics for each user
CREATE TABLE IF NOT EXISTS compliance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  month TEXT NOT NULL, -- Format: '2026-02'

  -- Compliance components (each 0-100%)
  lead_logging_score DECIMAL(5,2) DEFAULT 0 CHECK (lead_logging_score BETWEEN 0 AND 100),
  review_collection_score DECIMAL(5,2) DEFAULT 0 CHECK (review_collection_score BETWEEN 0 AND 100),
  target_achievement_score DECIMAL(5,2) DEFAULT 0 CHECK (target_achievement_score BETWEEN 0 AND 100),
  streak_score DECIMAL(5,2) DEFAULT 0 CHECK (streak_score BETWEEN 0 AND 100),
  data_quality_score DECIMAL(5,2) DEFAULT 0 CHECK (data_quality_score BETWEEN 0 AND 100),

  -- Overall (average of 5 components)
  overall_score DECIMAL(5,2) GENERATED ALWAYS AS (
    (lead_logging_score + review_collection_score + target_achievement_score +
     streak_score + data_quality_score) / 5
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_compliance_user_month ON compliance_scores(user_id, month);
CREATE INDEX IF NOT EXISTS idx_compliance_org ON compliance_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_overall ON compliance_scores(overall_score DESC);

COMMENT ON TABLE compliance_scores IS 'Monthly compliance scores for sales reps';
COMMENT ON COLUMN compliance_scores.overall_score IS 'Target: 96% for full incentive';

-- 1.4 OFFLINE ACTIONS TABLE
-- Queue for offline actions to be synced when online
CREATE TABLE IF NOT EXISTS offline_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  action_type TEXT NOT NULL, -- 'create_lead', 'collect_review', 'log_activity'
  action_data JSONB NOT NULL,

  synced BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_actions_user ON offline_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_actions_synced ON offline_actions(synced) WHERE NOT synced;
CREATE INDEX IF NOT EXISTS idx_offline_actions_created ON offline_actions(created_at);

COMMENT ON TABLE offline_actions IS 'Queue for offline actions awaiting sync';

-- 1.5 DAILY TARGETS TABLE
-- Track daily sales targets and achievements
CREATE TABLE IF NOT EXISTS daily_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  -- Targets
  target_leads INTEGER DEFAULT 5,
  target_reviews INTEGER DEFAULT 2,
  target_sales_amount DECIMAL(10,2) DEFAULT 0,

  -- Achievements
  achieved_leads INTEGER DEFAULT 0,
  achieved_reviews INTEGER DEFAULT 0,
  achieved_sales_amount DECIMAL(10,2) DEFAULT 0,

  -- Calculated progress
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

CREATE INDEX IF NOT EXISTS idx_daily_targets_user_date ON daily_targets(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_targets_org ON daily_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_targets_date ON daily_targets(date DESC);

COMMENT ON TABLE daily_targets IS 'Daily targets and achievements for sales reps';

-- ================================================
-- PART 2: MODIFY EXISTING TABLES
-- ================================================

-- 2.1 UPDATE USERS TABLE
-- Add language preference and 2XG Earn settings
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'hi'
CHECK (preferred_language IN ('hi', 'en', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'or'));

ALTER TABLE users
ADD COLUMN IF NOT EXISTS voice_input_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS nfc_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

COMMENT ON COLUMN users.preferred_language IS 'UI language: Hindi (hi) default, + 9 regional languages';
COMMENT ON COLUMN users.voice_input_enabled IS 'Whether user has voice input enabled';
COMMENT ON COLUMN users.nfc_enabled IS 'Whether user device supports NFC';

-- 2.2 UPDATE LEADS TABLE
-- Add voice input tracking and data quality
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS created_via TEXT DEFAULT 'form'
CHECK (created_via IN ('form', 'voice', 'import'));

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS voice_transcript TEXT;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS data_quality_score DECIMAL(5,2) DEFAULT 100.00
CHECK (data_quality_score BETWEEN 0 AND 100);

COMMENT ON COLUMN leads.created_via IS 'How the lead was created: form, voice, or import';
COMMENT ON COLUMN leads.voice_transcript IS 'Original voice transcript if created via voice input';
COMMENT ON COLUMN leads.data_quality_score IS 'Data completeness score (0-100) for compliance';

CREATE INDEX IF NOT EXISTS idx_leads_created_via ON leads(created_via);
CREATE INDEX IF NOT EXISTS idx_leads_data_quality ON leads(data_quality_score);

-- 2.3 UPDATE ORGANIZATIONS TABLE
-- Add Google Places API configuration
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS google_review_link TEXT;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS nfc_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN organizations.google_place_id IS 'Google Places API Place ID for reviews';
COMMENT ON COLUMN organizations.google_review_link IS 'Direct Google Review link for this business';
COMMENT ON COLUMN organizations.nfc_enabled IS 'Whether this organization uses NFC review collection';

-- ================================================
-- PART 3: CREATE HELPER FUNCTIONS
-- ================================================

-- 3.1 FUNCTION: Update user streak when activity occurs
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID, p_organization_id UUID)
RETURNS void AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_bridges_available INTEGER;
BEGIN
  -- Get current streak data
  SELECT last_activity_date, current_streak, bridges_available
  INTO v_last_activity, v_current_streak, v_bridges_available
  FROM streaks
  WHERE user_id = p_user_id;

  -- If no streak record exists, create one
  IF NOT FOUND THEN
    INSERT INTO streaks (user_id, organization_id, current_streak, last_activity_date)
    VALUES (p_user_id, p_organization_id, 1, CURRENT_DATE);
    RETURN;
  END IF;

  -- Check if activity is today (already logged)
  IF v_last_activity = CURRENT_DATE THEN
    RETURN;
  END IF;

  -- Check if activity was yesterday (continue streak)
  IF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE streaks
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN;
  END IF;

  -- Check if we can use a bridge (missed 1 day but have bridges)
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

  -- Streak broken, reset to 1
  UPDATE streaks
  SET current_streak = 1,
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_streak IS 'Update user streak when daily activity occurs';

-- 3.2 FUNCTION: Calculate compliance score for a user-month
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
  -- Get number of days in month
  SELECT EXTRACT(DAY FROM (DATE_TRUNC('month', (p_month || '-01')::DATE) + INTERVAL '1 month - 1 day'))::INTEGER
  INTO v_days_in_month;

  -- 1. Lead logging score (target: 5 leads/day)
  SELECT LEAST(100, (COUNT(*)::DECIMAL / (5 * v_days_in_month)) * 100) INTO v_lead_score
  FROM leads
  WHERE sales_rep_id = p_user_id
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month;

  -- 2. Review collection score (target: 2 reviews/day)
  SELECT LEAST(100, (COUNT(*)::DECIMAL / (2 * v_days_in_month)) * 100) INTO v_review_score
  FROM google_reviews
  WHERE sales_rep_id = p_user_id
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month
    AND review_submitted = TRUE;

  -- 3. Target achievement score (based on daily targets)
  SELECT COALESCE(AVG(overall_percentage), 0) INTO v_target_score
  FROM daily_targets
  WHERE user_id = p_user_id
    AND TO_CHAR(date, 'YYYY-MM') = p_month;

  -- 4. Streak score (days with activity / total days in month)
  SELECT LEAST(100, (COUNT(DISTINCT DATE(created_at))::DECIMAL / v_days_in_month) * 100) INTO v_streak_score
  FROM leads
  WHERE sales_rep_id = p_user_id
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month;

  -- 5. Data quality score (average of all leads' quality scores)
  SELECT COALESCE(AVG(data_quality_score), 100) INTO v_quality_score
  FROM leads
  WHERE sales_rep_id = p_user_id
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month;

  -- Upsert compliance score
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

COMMENT ON FUNCTION calculate_compliance_score IS 'Calculate 5-component compliance score for user-month';

-- 3.3 FUNCTION: Reset weekly bridges (run via cron)
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

COMMENT ON FUNCTION reset_weekly_bridges IS 'Reset streak bridges weekly (1 bridge/week)';

-- ================================================
-- PART 4: ROW LEVEL SECURITY POLICIES
-- ================================================

-- 4.1 STREAKS POLICIES
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own streaks" ON streaks;
CREATE POLICY "Users can view their own streaks"
ON streaks FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager', 'super_admin')
);

DROP POLICY IF EXISTS "Users can update their own streaks" ON streaks;
CREATE POLICY "Users can update their own streaks"
ON streaks FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert streaks" ON streaks;
CREATE POLICY "System can insert streaks"
ON streaks FOR INSERT
WITH CHECK (true);

-- 4.2 GOOGLE REVIEWS POLICIES
ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org reviews" ON google_reviews;
CREATE POLICY "Users can view their org reviews"
ON google_reviews FOR SELECT
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create reviews" ON google_reviews;
CREATE POLICY "Users can create reviews"
ON google_reviews FOR INSERT
WITH CHECK (sales_rep_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their reviews" ON google_reviews;
CREATE POLICY "Users can update their reviews"
ON google_reviews FOR UPDATE
USING (sales_rep_id = auth.uid());

-- 4.3 COMPLIANCE SCORES POLICIES
ALTER TABLE compliance_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view compliance scores" ON compliance_scores;
CREATE POLICY "Users can view compliance scores"
ON compliance_scores FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager', 'super_admin')
);

DROP POLICY IF EXISTS "System can manage compliance scores" ON compliance_scores;
CREATE POLICY "System can manage compliance scores"
ON compliance_scores FOR ALL
USING (true)
WITH CHECK (true);

-- 4.4 OFFLINE ACTIONS POLICIES
ALTER TABLE offline_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their offline actions" ON offline_actions;
CREATE POLICY "Users can manage their offline actions"
ON offline_actions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4.5 DAILY TARGETS POLICIES
ALTER TABLE daily_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their targets" ON daily_targets;
CREATE POLICY "Users can view their targets"
ON daily_targets FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager', 'super_admin')
);

DROP POLICY IF EXISTS "Admins can manage targets" ON daily_targets;
CREATE POLICY "Admins can manage targets"
ON daily_targets FOR ALL
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager', 'super_admin')
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager', 'super_admin')
);

-- ================================================
-- PART 5: INITIALIZE DATA
-- ================================================

-- 5.1 Create streak records for existing users
INSERT INTO streaks (user_id, organization_id, current_streak, last_activity_date)
SELECT
  id,
  organization_id,
  0,
  NULL
FROM users
WHERE role IN ('sales_rep', 'staff')
  AND organization_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5.2 Create daily targets for existing users (today)
INSERT INTO daily_targets (user_id, organization_id, date, target_leads, target_reviews, target_sales_amount)
SELECT
  id,
  organization_id,
  CURRENT_DATE,
  5,  -- Default: 5 leads/day
  2,  -- Default: 2 reviews/day
  0   -- Sales amount to be set by manager
FROM users
WHERE role IN ('sales_rep', 'staff')
  AND organization_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ================================================
-- PART 6: CREATE TRIGGERS
-- ================================================

-- 6.1 Trigger to update streaks.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_streaks_updated_at ON streaks;
CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_compliance_scores_updated_at ON compliance_scores;
CREATE TRIGGER update_compliance_scores_updated_at
  BEFORE UPDATE ON compliance_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_targets_updated_at ON daily_targets;
CREATE TRIGGER update_daily_targets_updated_at
  BEFORE UPDATE ON daily_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Count new tables
SELECT
  'streaks' as table_name,
  COUNT(*) as row_count
FROM streaks
UNION ALL
SELECT 'google_reviews', COUNT(*) FROM google_reviews
UNION ALL
SELECT 'compliance_scores', COUNT(*) FROM compliance_scores
UNION ALL
SELECT 'offline_actions', COUNT(*) FROM offline_actions
UNION ALL
SELECT 'daily_targets', COUNT(*) FROM daily_targets;

-- Verify new columns on users
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('preferred_language', 'voice_input_enabled', 'nfc_enabled', 'profile_picture_url');

-- Verify new columns on leads
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('created_via', 'voice_transcript', 'data_quality_score');

-- ================================================
-- END OF MIGRATION
-- Run this SQL file in Supabase SQL Editor
-- After running, execute: NOTIFY pgrst, 'reload schema';
-- ================================================
