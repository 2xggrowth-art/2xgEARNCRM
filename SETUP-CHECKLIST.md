# Fresh Supabase Setup - Quick Checklist ✅

## Your Supabase Details
- **Project URL:** https://jdhsodkuhsbpjbhlejyw.supabase.co
- **Project Dashboard:** https://supabase.com/dashboard/project/jdhsodkuhsbpjbhlejyw

---

## 📋 Setup Steps (20 minutes total)

### ☐ Step 1: Run Initial Schema (5 min)
```
1. Open Supabase → SQL Editor → New query
2. Copy content from: migrations/00-initial-schema.sql
3. Paste and Run
4. Wait for "Success. No rows returned"
```

### ☐ Step 2: Run Phase 2.1 Migration (2 min)
```
1. SQL Editor → New query
2. Copy content from: migrations/phase-2.1-role-hierarchy.sql
3. Paste and Run
4. Wait for success message
```

### ☐ Step 3: Create Super Admin (3 min)
```bash
# 3a. Generate PIN hash (in terminal)
cd "e:\2xg\Lead-CRM(2xgearn)\lead-CRM"
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('1234', 10).then(console.log);"

# 3b. In Supabase → Table Editor → users → Insert row
phone: 9999999999
name: Super Admin
role: super_admin
pin_hash: [paste hash from 3a]
```

### ☐ Step 4: Test Super Admin Login (2 min)
```
1. Go to: http://localhost:3000/login
2. Phone: 9999999999
3. PIN: 1234
4. Should see Super Admin Dashboard
```

### ☐ Step 5: Create First Organization (3 min)
```
1. Click "+ New Organization"
2. Fill in:
   - Organization Name: My Company
   - Manager Name: John Manager
   - Manager Phone: 8888888888
   - Manager PIN: 5678
3. Click Create
```

### ☐ Step 6: Test Manager Login (2 min)
```
1. Logout
2. Login: 8888888888 / 5678
3. Should see Manager Dashboard
```

### ☐ Step 7: Add Team Members (3 min)
```
1. Click "+ Add Team Member"
2. Add Sales Rep:
   - Name: Sales Rep 1
   - Phone: 7777777777
   - Role: Sales Representative
   - PIN: 1111

3. Add Staff:
   - Name: Staff 1
   - Phone: 6666666666
   - Role: Staff
   - PIN: 2222
```

### ☐ Step 8: Test Sales Rep (2 min)
```
1. Logout
2. Login: 7777777777 / 1111
3. Create a test lead
4. Verify it works
```

### ☐ Step 9: Verify Everything (2 min)
```sql
-- Run in Supabase SQL Editor to verify:

SELECT name, phone, role FROM users ORDER BY created_at;
-- Should show 4 users

SELECT role, COUNT(*) FROM role_permissions GROUP BY role;
-- Should show permissions for all roles
```

---

## ✅ Success Checklist

After setup, you should have:
- [ ] 9 tables in Supabase
- [ ] 4 users (super_admin, manager, sales_rep, staff)
- [ ] 1 organization
- [ ] 5 default categories
- [ ] 25 permissions defined
- [ ] All users can login
- [ ] Each role sees correct dashboard
- [ ] Manager can see team members
- [ ] Sales rep can create leads

---

## 🆘 Quick Fixes

**Can't login?**
→ Clear localStorage: F12 → Application → Local Storage → Clear

**Migration error?**
→ Make sure you ran 00-initial-schema.sql FIRST

**Wrong dashboard?**
→ Check user.role in localStorage matches expected role

**Team not showing?**
→ Verify manager_id is set: `SELECT * FROM users WHERE manager_id IS NOT NULL;`

---

## 📚 Full Documentation

- **For detailed setup:** `FRESH-SETUP-GUIDE.md`
- **For features:** `README-PHASE-2.1.md`
- **For API docs:** `PHASE-2.1-IMPLEMENTATION-GUIDE.md`
- **For quick ref:** `QUICK-START.md`

---

## 🎯 Test Users After Setup

| Role | Phone | PIN | Use Case |
|------|-------|-----|----------|
| Super Admin | 9999999999 | 1234 | System management |
| Manager | 8888888888 | 5678 | Team management |
| Sales Rep | 7777777777 | 1111 | Create leads |
| Staff | 6666666666 | 2222 | Create leads |

---

**Ready?** Start with **FRESH-SETUP-GUIDE.md** for detailed instructions!

**Estimated Time:** 20 minutes total ⏱️
