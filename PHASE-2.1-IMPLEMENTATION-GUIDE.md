# Phase 2.1: Role Hierarchy System - Implementation Guide

## Overview
This guide explains how to implement and test the new 4-tier role hierarchy system in your Lead CRM.

**New Roles:**
- `super_admin` - Full system access across all organizations
- `manager` - Organization-level team management
- `staff` - Limited administrative access
- `sales_rep` - Field operations (existing role)

---

## Step 1: Run Database Migration

### 1.1 Access Supabase SQL Editor
1. Go to your Supabase project: https://supabase.com/dashboard/project/jdhsodkuhsbpjbhlejyw
2. Navigate to **SQL Editor** from the left sidebar
3. Click **New query**

### 1.2 Execute Migration
1. Open the migration file: `migrations/phase-2.1-role-hierarchy.sql`
2. Copy the entire SQL content
3. Paste into Supabase SQL Editor
4. Click **Run** button
5. Wait for "Success. No rows returned" message

### 1.3 Verify Migration
Run this query to verify the migration:

```sql
-- Check new role constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'users_role_check';

-- Check if manager_id column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'manager_id';

-- Check role_permissions table
SELECT role, COUNT(*) as permission_count
FROM role_permissions
GROUP BY role
ORDER BY role;

-- Expected output:
-- manager: 10 permissions
-- sales_rep: 6 permissions
-- staff: 7 permissions
-- super_admin: 25 permissions
```

---

## Step 2: Create Your First Super Admin

### 2.1 Manually Create Super Admin User
Since there's no super admin yet, you need to create one manually in Supabase:

1. Go to **Table Editor** → **users** table
2. Click **Insert** → **Insert row**
3. Fill in the fields:
   ```
   phone: 9999999999
   name: Super Admin
   role: super_admin
   organization_id: [leave NULL or use any org ID]
   pin_hash: [generate using bcrypt - see below]
   created_at: [auto-filled]
   ```

### 2.2 Generate PIN Hash
To generate a bcrypt hash for PIN "1234", run this in Node.js:

```javascript
// In terminal:
cd "e:\2xg\Lead-CRM(2xgearn)\lead-CRM"
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('1234', 10).then(hash => console.log(hash));"
```

Copy the output hash and paste it into the `pin_hash` field.

### 2.3 Test Super Admin Login
1. Go to http://localhost:3000/login
2. Enter phone: `9999999999`
3. Enter PIN: `1234`
4. You should be redirected to `/super-admin/dashboard`

---

## Step 3: Test Super Admin Dashboard

### 3.1 View System Stats
- Total organizations count
- Total users count
- Total leads count
- Revenue statistics
- Users by role breakdown
- Recent activity (last 7 days)

### 3.2 Create New Organization
1. Click **+ New Organization** button
2. Fill in the form:
   ```
   Organization Name: Test Company
   Contact Number: 9876543210 (optional)
   Manager Name: John Manager
   Manager Phone: 8888888888
   Manager PIN: 5678
   ```
3. Click **Create**
4. Verify organization appears in the list

### 3.3 Verify Organization Created
Check in Supabase:
```sql
SELECT o.name, u.name as manager_name, u.role
FROM organizations o
JOIN users u ON u.organization_id = o.id
WHERE o.name = 'Test Company';

-- Should show:
-- Test Company | John Manager | manager
```

---

## Step 4: Test Manager Dashboard

### 4.1 Login as Manager
1. Logout from super admin
2. Login with:
   - Phone: `8888888888`
   - PIN: `5678`
3. Should redirect to `/manager/dashboard`

### 4.2 Add Team Members
1. Click **+ Add Team Member**
2. Add a Sales Rep:
   ```
   Name: Sales Rep 1
   Phone: 7777777777
   Role: Sales Representative
   PIN: 1111
   ```
3. Add a Staff Member:
   ```
   Name: Staff 1
   Phone: 6666666666
   Role: Staff
   PIN: 2222
   ```
4. Verify both appear in team list

### 4.3 Verify Team Assignment
Check in Supabase:
```sql
SELECT name, role, manager_id
FROM users
WHERE phone IN ('7777777777', '6666666666');

-- Both should have manager_id set to John Manager's user ID
```

---

## Step 5: Test Staff and Sales Rep Access

### 5.1 Login as Sales Rep
1. Login with phone `7777777777`, PIN `1111`
2. Should redirect to `/dashboard` (existing sales rep dashboard)
3. Create a test lead
4. Verify lead appears in dashboard

### 5.2 Login as Staff
1. Login with phone `6666666666`, PIN `2222`
2. Should redirect to `/staff/dashboard` → then `/dashboard`
3. Staff uses same dashboard as sales rep for now
4. Can create and view leads

### 5.3 Verify Manager Can See Team Leads
1. Login back as manager (8888888888)
2. Navigate to team performance
3. Should see lead counts for both team members

---

## Step 6: Test Permission System

### 6.1 Test API Permissions
Use browser DevTools or Postman to test:

```javascript
// Get token from localStorage
const token = localStorage.getItem('token');

// Test super admin endpoint (should work for super_admin only)
fetch('/api/super-admin/organizations', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Test manager endpoint (should work for manager and super_admin)
fetch('/api/manager/team', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 6.2 Expected Permission Results

| Endpoint | super_admin | manager | staff | sales_rep |
|----------|-------------|---------|-------|-----------|
| `/api/super-admin/organizations` | ✅ | ❌ | ❌ | ❌ |
| `/api/super-admin/stats` | ✅ | ❌ | ❌ | ❌ |
| `/api/manager/team` | ✅ | ✅ | ❌ | ❌ |
| `/api/manager/team/assign` | ✅ | ✅ | ❌ | ❌ |
| `/api/leads/my-leads` | ✅ | ✅ | ✅ | ✅ |
| `/api/leads/create` | ✅ | ✅ | ✅ | ✅ |

---

## Step 7: Update Existing Admin Users (Backward Compatibility)

If you have existing users with role `admin`, you need to migrate them to `manager`:

```sql
-- Migrate all admin users to manager role
UPDATE users
SET role = 'manager'
WHERE role = 'admin';

-- Verify migration
SELECT role, COUNT(*)
FROM users
GROUP BY role;
```

---

## Step 8: Environment Variables

Ensure these variables are set in `.env.local`:

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=https://jdhsodkuhsbpjbhlejyw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_meRJwmZy5lHMg6BmXJvKlA_IgCUBI3i
SUPABASE_SERVICE_ROLE_KEY=sb_secret_DkCZgkkMbhhUZ0ZYONv8rA__QH-xSTN
JWT_SECRET=your-secret-key-change-in-production

# Optional (for future phases)
SMS_PROVIDER=console
```

---

## Step 9: Testing Checklist

- [ ] Database migration completed successfully
- [ ] Super admin user created and can login
- [ ] Super admin dashboard loads with stats
- [ ] Super admin can create new organization
- [ ] Manager user created automatically with org
- [ ] Manager can login and see dashboard
- [ ] Manager can add team members (staff & sales_rep)
- [ ] Team members get assigned to manager (manager_id set)
- [ ] Sales rep can login and create leads
- [ ] Staff can login and create leads
- [ ] Manager can see team performance stats
- [ ] Permission checks work for all endpoints
- [ ] Role-based redirects work correctly
- [ ] Existing admin users migrated to manager

---

## Troubleshooting

### Issue: "Invalid role" error when creating user
**Solution:** Make sure the database migration ran successfully. Check the users_role_check constraint.

### Issue: Super admin dashboard shows "Unauthorized"
**Solution:**
1. Check if JWT token is valid in localStorage
2. Verify token includes `role: 'super_admin'`
3. Clear localStorage and login again

### Issue: Manager can't see team members
**Solution:** Check if `manager_id` is set correctly in users table:
```sql
SELECT id, name, role, manager_id FROM users WHERE role IN ('staff', 'sales_rep');
```

### Issue: API returns 403 Forbidden
**Solution:**
1. Check the Authorization header is being sent
2. Verify user role has required permission in `role_permissions` table
3. Check permission logic in `lib/permissions.ts`

### Issue: Build errors with TypeScript
**Solution:** Run `npm run build` to see specific errors. Most common:
- Import path issues: Update to use `@/lib/...`
- Type mismatches: Check UserRole type includes all 4 roles

---

## API Reference

### Super Admin Endpoints

#### GET /api/super-admin/organizations
List all organizations with user and lead counts.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Organization Name",
      "userCount": 10,
      "leadCount": 150,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/super-admin/organizations
Create new organization with manager.

**Body:**
```json
{
  "name": "New Company",
  "contactNumber": "9876543210",
  "adminName": "Manager Name",
  "adminPhone": "9999999999",
  "adminPin": "1234"
}
```

#### GET /api/super-admin/stats
Get system-wide statistics.

### Manager Endpoints

#### GET /api/manager/team
Get manager's team members with stats.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Sales Rep Name",
      "phone": "9999999999",
      "role": "sales_rep",
      "stats": {
        "totalLeads": 25,
        "winCount": 10,
        "revenue": 50000,
        "conversionRate": 40
      }
    }
  ]
}
```

#### POST /api/manager/team
Add new team member.

**Body:**
```json
{
  "name": "New Member",
  "phone": "9999999999",
  "role": "sales_rep",
  "pin": "1234"
}
```

#### POST /api/manager/team/assign
Assign staff/sales_rep to a manager.

**Body:**
```json
{
  "userId": "uuid",
  "managerId": "uuid"
}
```

#### PUT /api/users/[id]/role
Update user role.

**Body:**
```json
{
  "role": "manager"
}
```

---

## Next Steps (Future Phases)

After completing Phase 2.1, you can proceed to:

1. **Phase 2.2:** Target Setting System
2. **Phase 2.3:** Incentive Calculation
3. **Phase 2.4:** Lead Score Decay & Expiry
4. **Phase 2.5:** Customer Touchpoints
5. **Phase 2.6:** Employee NPS/CSAT
6. **Phase 2.7:** Comprehensive Reports
7. **Phase 2.8:** WhatsApp Integration

---

## Files Created/Modified

### New Files:
- `migrations/phase-2.1-role-hierarchy.sql`
- `lib/permissions.ts`
- `lib/middleware.ts`
- `app/api/super-admin/organizations/route.ts`
- `app/api/super-admin/stats/route.ts`
- `app/api/manager/team/route.ts`
- `app/api/manager/team/assign/route.ts`
- `app/api/users/[id]/role/route.ts`
- `app/super-admin/dashboard/page.tsx`
- `app/manager/dashboard/page.tsx`
- `app/staff/dashboard/page.tsx`

### Modified Files:
- `lib/types.ts` - Added new roles and manager_id
- `app/page.tsx` - Updated routing for all roles

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review console errors in browser DevTools
3. Check Supabase logs in the dashboard
4. Verify database migration completed successfully

For Phase 2.2 and beyond, refer to the main Phase 2 implementation prompt.
