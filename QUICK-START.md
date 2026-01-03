# Phase 2.1 Quick Start Guide

## 🚀 5-Minute Setup

### 1. Run Database Migration (2 minutes)
```bash
# 1. Open Supabase SQL Editor
# 2. Copy content from: migrations/phase-2.1-role-hierarchy.sql
# 3. Paste and Run
# 4. Wait for success message
```

### 2. Create Super Admin (2 minutes)
```bash
# Generate PIN hash for "1234"
cd "e:\2xg\Lead-CRM(2xgearn)\lead-CRM"
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('1234', 10).then(console.log);"

# Then in Supabase Table Editor → users → Insert:
# phone: 9999999999
# name: Super Admin
# role: super_admin
# pin_hash: [paste generated hash]
```

### 3. Login and Test (1 minute)
```bash
# Visit: http://localhost:3000/login
# Phone: 9999999999
# PIN: 1234
# Should see: Super Admin Dashboard
```

---

## 📱 Test User Accounts

Create these test accounts for full testing:

| Role | Phone | PIN | Dashboard |
|------|-------|-----|-----------|
| Super Admin | 9999999999 | 1234 | `/super-admin/dashboard` |
| Manager | 8888888888 | 5678 | `/manager/dashboard` |
| Staff | 6666666666 | 2222 | `/staff/dashboard` → `/dashboard` |
| Sales Rep | 7777777777 | 1111 | `/dashboard` |

---

## 🔑 Key Endpoints

### Super Admin
```javascript
GET  /api/super-admin/organizations     // List all orgs
POST /api/super-admin/organizations     // Create org + manager
GET  /api/super-admin/stats             // System stats
```

### Manager
```javascript
GET  /api/manager/team                  // Get team members
POST /api/manager/team                  // Add team member
POST /api/manager/team/assign           // Assign manager
```

### User Management
```javascript
PUT  /api/users/[id]/role              // Update role
```

---

## 🎯 Quick Tests

### Test 1: Create Organization (Super Admin)
```javascript
// Login as super admin, then:
fetch('/api/super-admin/organizations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Test Company",
    adminName: "John Manager",
    adminPhone: "8888888888",
    adminPin: "5678"
  })
});
```

### Test 2: Add Team Member (Manager)
```javascript
// Login as manager, then:
fetch('/api/manager/team', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Sales Rep 1",
    phone: "7777777777",
    role: "sales_rep",
    pin: "1111"
  })
});
```

### Test 3: Verify Permissions
```sql
-- In Supabase SQL Editor:
SELECT r.role, COUNT(*) as permission_count
FROM role_permissions r
GROUP BY r.role;

-- Expected:
-- super_admin: 25
-- manager: 10
-- staff: 7
-- sales_rep: 6
```

---

## 🐛 Common Issues & Fixes

### Issue: "Invalid role" error
```sql
-- Check role constraint:
SELECT check_clause FROM information_schema.check_constraints
WHERE constraint_name = 'users_role_check';
```

### Issue: Permission denied
```javascript
// Check your token has correct role:
const token = localStorage.getItem('token');
console.log(JSON.parse(atob(token.split('.')[1])));
// Should show: { role: "super_admin", ... }
```

### Issue: Manager can't see team
```sql
-- Check manager_id is set:
SELECT name, role, manager_id FROM users
WHERE role IN ('staff', 'sales_rep');
```

---

## 📚 File Locations

| What | Where |
|------|-------|
| Migration SQL | `migrations/phase-2.1-role-hierarchy.sql` |
| Permissions | `lib/permissions.ts` |
| Middleware | `lib/middleware.ts` |
| Super Admin APIs | `app/api/super-admin/` |
| Manager APIs | `app/api/manager/` |
| Dashboards | `app/[role]/dashboard/page.tsx` |
| Full Guide | `PHASE-2.1-IMPLEMENTATION-GUIDE.md` |

---

## ✅ Verification Checklist

- [ ] Migration completed (no errors in Supabase)
- [ ] 4 roles exist in `role_permissions` table
- [ ] `manager_id` column exists in `users` table
- [ ] Super admin user created manually
- [ ] Super admin can login and see dashboard
- [ ] Super admin can create organization
- [ ] Manager user auto-created with organization
- [ ] Manager can login and see team dashboard
- [ ] Manager can add sales rep
- [ ] Sales rep can login and create leads
- [ ] All dashboards redirect correctly

---

## 🔄 Rollback Plan

If something goes wrong:

```sql
-- Rollback Step 1: Drop new tables
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;

-- Rollback Step 2: Remove new column
ALTER TABLE users DROP COLUMN IF EXISTS manager_id;

-- Rollback Step 3: Restore old role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'sales_rep'));

-- Rollback Step 4: Revert roles
UPDATE users SET role = 'admin' WHERE role IN ('super_admin', 'manager');
UPDATE users SET role = 'sales_rep' WHERE role = 'staff';
```

---

## 🎓 Next Learning

1. Read `PHASE-2.1-IMPLEMENTATION-GUIDE.md` for details
2. Review `lib/permissions.ts` to understand permission system
3. Explore `lib/middleware.ts` for auth patterns
4. Check API routes to see permission usage
5. Review dashboard code for UI patterns

---

**Need Help?**
- Check: `PHASE-2.1-IMPLEMENTATION-GUIDE.md` (Troubleshooting section)
- Review: `PHASE-2.1-SUMMARY.md` (Complete feature list)
- Inspect: Browser console for errors
- Verify: Supabase logs for database errors

---

**Ready for Phase 2.2?**
See the main Phase 2 prompt for Target Setting System implementation.
