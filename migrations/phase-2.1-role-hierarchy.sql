-- Phase 2.1: Role Hierarchy System Migration
-- Run this in Supabase SQL Editor after the initial schema

-- ============================================
-- STEP 1: Alter users table for new roles
-- ============================================

-- Drop old role constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new role constraint with 4 roles
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('super_admin', 'manager', 'staff', 'sales_rep'));

-- Add manager relationship for staff/sales_rep
ALTER TABLE users
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for manager lookups
CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);

-- Add pin_hash column if not exists (for authentication)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pin_hash TEXT;

COMMENT ON COLUMN users.manager_id IS 'Manager assigned to this staff/sales_rep (NULL for super_admin/manager)';
COMMENT ON COLUMN users.pin_hash IS 'Bcrypt hash of 4-digit PIN for authentication';

-- ============================================
-- STEP 2: Create role_permissions table
-- ============================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'manager', 'staff', 'sales_rep')),
  permission TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

COMMENT ON TABLE role_permissions IS 'Defines permissions for each role in the system';

-- ============================================
-- STEP 3: Insert default role permissions
-- ============================================

-- Super Admin: Full system access across all organizations
INSERT INTO role_permissions (role, permission, description) VALUES
('super_admin', 'view_all_organizations', 'View all organizations in the system'),
('super_admin', 'manage_organizations', 'Create, update, delete organizations'),
('super_admin', 'view_system_reports', 'Access system-wide analytics and reports'),
('super_admin', 'manage_all_users', 'Create, update, delete users across all orgs'),
('super_admin', 'manage_permissions', 'Update role permissions'),
('super_admin', 'view_all_leads', 'View leads across all organizations'),
('super_admin', 'export_system_data', 'Export system-wide data')
ON CONFLICT (role, permission) DO NOTHING;

-- Manager: Organization-level management
INSERT INTO role_permissions (role, permission, description) VALUES
('manager', 'view_team_leads', 'View leads from entire team'),
('manager', 'manage_team', 'Add, remove, assign staff and sales reps'),
('manager', 'set_targets', 'Set sales targets for team members'),
('manager', 'view_reports', 'View team performance reports'),
('manager', 'export_data', 'Export team data and reports'),
('manager', 'manage_categories', 'Manage product categories'),
('manager', 'view_organization_settings', 'View organization settings'),
('manager', 'update_organization_settings', 'Update organization settings'),
('manager', 'reset_team_pins', 'Reset PINs for team members'),
('manager', 'approve_incentives', 'Approve incentive payouts')
ON CONFLICT (role, permission) DO NOTHING;

-- Staff: Limited administrative access
INSERT INTO role_permissions (role, permission, description) VALUES
('staff', 'view_assigned_leads', 'View leads assigned to them'),
('staff', 'create_leads', 'Create new leads'),
('staff', 'view_own_reports', 'View personal performance reports'),
('staff', 'update_own_leads', 'Update their own leads'),
('staff', 'view_categories', 'View product categories'),
('staff', 'view_targets', 'View assigned targets')
ON CONFLICT (role, permission) DO NOTHING;

-- Sales Rep: Field operations
INSERT INTO role_permissions (role, permission, description) VALUES
('sales_rep', 'create_leads', 'Create new leads'),
('sales_rep', 'view_own_leads', 'View only their own leads'),
('sales_rep', 'update_own_leads', 'Update their own leads'),
('sales_rep', 'view_categories', 'View product categories'),
('sales_rep', 'view_targets', 'View assigned targets'),
('sales_rep', 'view_own_incentives', 'View personal incentive earnings')
ON CONFLICT (role, permission) DO NOTHING;

-- ============================================
-- STEP 4: Create system_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

COMMENT ON TABLE system_settings IS 'System-wide configuration settings (super_admin only)';

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
('lead_score_decay_enabled', 'true', 'Enable automatic lead score decay'),
('lead_score_decay_days', '3', 'Days before lead score starts decaying'),
('lead_score_decay_points', '10', 'Points to deduct daily'),
('lead_expiry_days', '10', 'Days until lead auto-expires'),
('touchpoints_required', '2', 'Minimum touchpoints per lost lead'),
('whatsapp_enabled', 'true', 'Enable WhatsApp integration')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- STEP 5: Update RLS policies for new roles
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can insert users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Admins can view all leads in their organization" ON leads;

-- Organizations: Super admins see all, others see their own
CREATE POLICY "Users can view organizations"
  ON organizations FOR SELECT
  USING (
    -- Super admins see all
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Others see only their org
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers and admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('manager', 'staff')
    )
  );

CREATE POLICY "Super admins can insert organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Users: Role-based access
CREATE POLICY "Users can view users based on role"
  ON users FOR SELECT
  USING (
    -- Super admins see all users
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Managers see their team and other managers in org
    (
      organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role = 'manager'
      )
      AND (role IN ('staff', 'sales_rep') OR role = 'manager')
    )
    OR
    -- Staff/Sales reps see users in their org
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers can insert team members"
  ON users FOR INSERT
  WITH CHECK (
    -- Super admins can create anyone
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Managers can create staff/sales_rep in their org
    (
      role IN ('staff', 'sales_rep')
      AND organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role = 'manager'
      )
    )
  );

-- Categories: Manager and staff can manage
CREATE POLICY "Managers can manage categories"
  ON categories FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('manager', 'staff')
    )
  );

-- Leads: Hierarchical access
CREATE POLICY "Users can view leads based on role"
  ON leads FOR SELECT
  USING (
    -- Super admins see all leads
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Managers see all leads in their org
    (
      organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role = 'manager'
      )
    )
    OR
    -- Staff see leads from their team (sales reps under them)
    (
      sales_rep_id IN (
        SELECT id FROM users
        WHERE manager_id = auth.uid() AND role = 'sales_rep'
      )
    )
    OR
    -- Sales reps see only their own leads
    sales_rep_id = auth.uid()
  );

-- ============================================
-- STEP 6: Create helper functions
-- ============================================

-- Check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = user_id;

  RETURN EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role = user_role AND permission = permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_has_permission IS 'Check if a user has a specific permission based on their role';

-- Get user's team members (for managers)
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
  SELECT
    u.id,
    u.name,
    u.phone,
    u.role,
    u.last_login
  FROM users u
  WHERE u.manager_id = manager_user_id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_team_members IS 'Get all team members assigned to a manager';

-- Assign manager to user
CREATE OR REPLACE FUNCTION assign_manager(user_id UUID, manager_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_org UUID;
  manager_org UUID;
  manager_role TEXT;
BEGIN
  -- Get user's organization
  SELECT organization_id INTO user_org FROM users WHERE id = user_id;

  -- Get manager's organization and role
  SELECT organization_id, role INTO manager_org, manager_role
  FROM users WHERE id = manager_user_id;

  -- Validate: same organization and manager has manager role
  IF user_org = manager_org AND manager_role = 'manager' THEN
    UPDATE users SET manager_id = manager_user_id WHERE id = user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assign_manager IS 'Assign a manager to a staff/sales_rep user';

-- ============================================
-- STEP 7: Enable RLS on new tables
-- ============================================

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS for role_permissions (read-only for all, manage by super_admin)
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- RLS for system_settings (read by managers, write by super_admin)
CREATE POLICY "Managers can view system settings"
  ON system_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('super_admin', 'manager')
    )
  );

CREATE POLICY "Super admins can manage system settings"
  ON system_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================
-- STEP 8: Update triggers
-- ============================================

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Phase 2.1 Migration Complete!';
  RAISE NOTICE 'New roles: super_admin, manager, staff, sales_rep';
  RAISE NOTICE 'Tables created: role_permissions, system_settings';
  RAISE NOTICE 'New column: users.manager_id';
  RAISE NOTICE 'Functions created: user_has_permission, get_team_members, assign_manager';
END $$;
