# Fresh Supabase Setup Guide - Complete Installation

## 🎯 You're Starting Fresh - Here's What to Do

Since this is a new Supabase instance with no data, follow these steps in order.

---

## Step 1: Run Initial Schema (5 minutes)

### 1.1 Access Supabase
1. Go to: https://supabase.com/dashboard/project/jdhsodkuhsbpjbhlejyw
2. Click **SQL Editor** in the left sidebar
3. Click **New query**

### 1.2 Run Base Schema
1. Open file: `migrations/00-initial-schema.sql`
2. Copy **ALL** the content (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **Run** button (or press Ctrl+Enter)
5. Wait for: ✅ "Success. No rows returned"

**What this creates:**
- 7 tables: organizations, users, categories, models, leads, otp_verifications, whatsapp_logs
- All indexes and relationships
- Row Level Security policies
- Helper functions

---

## Step 2: Run Phase 2.1 Migration (2 minutes)

### 2.1 Run Role Hierarchy Migration
1. Still in **SQL Editor**, click **New query**
2. Open file: `migrations/phase-2.1-role-hierarchy.sql`
3. Copy **ALL** the content
4. Paste into Supabase SQL Editor
5. Click **Run**
6. Wait for: ✅ "Success. No rows returned"

**What this adds:**
- Updates user roles to 4 types (super_admin, manager, staff, sales_rep)
- Adds manager_id column
- Creates role_permissions table
- Creates system_settings table
- Updates all security policies

---

## Step 3: Create Your First Super Admin (3 minutes)

### 3.1 Generate PIN Hash
Open terminal and run:
```bash
cd "e:\2xg\Lead-CRM(2xgearn)\lead-CRM"
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('1234', 10).then(console.log);"
```

Copy the output (long string starting with `$2a$10$...`)

### 3.2 Insert Super Admin User
1. In Supabase, go to **Table Editor** (left sidebar)
2. Click on **users** table
3. Click **Insert** → **Insert row**
4. Fill in these fields:

```
phone: 9999999999
name: Super Admin
role: super_admin
organization_id: [leave empty/NULL]
pin_hash: [paste the hash from step 3.1]
created_at: [auto-filled]
last_login: [leave empty]
manager_id: [leave empty]
```

5. Click **Save**

---

## Step 4: Test Your Setup (2 minutes)

### 4.1 Login as Super Admin
1. Make sure dev server is running: http://localhost:3000
2. Go to http://localhost:3000/login
3. Enter:
   - Phone: `9999999999`
   - PIN: `1234`
4. Click **Login with PIN**

### 4.2 You Should See
- Redirect to `/super-admin/dashboard`
- System statistics showing:
  - Total Organizations: 0
  - Total Users: 1
  - Total Leads: 0
  - Revenue: ₹0

**✅ Success!** Your super admin is working!

---

## Step 5: Create Your First Organization (3 minutes)

### 5.1 From Super Admin Dashboard
1. Click **+ New Organization** button
2. Fill in the form:

```
Organization Name: My Company
Contact Number: 9876543210 (optional)

--- Manager Details ---
Manager Name: John Manager
Manager Phone: 8888888888
Manager PIN: 5678
```

3. Click **Create**

### 5.2 Verify Creation
You should see:
- Success message
- Organization appears in the list with:
  - Name: My Company
  - Users: 1 (the manager)
  - Leads: 0

---

## Step 6: Test Manager Dashboard (2 minutes)

### 6.1 Logout and Login as Manager
1. Click **Logout** button (top right)
2. Login with:
   - Phone: `8888888888`
   - PIN: `5678`
3. Should redirect to `/manager/dashboard`

### 6.2 You Should See
- Team Members: 0
- Total Leads: 0
- Empty team performance table

---

## Step 7: Add Team Members (3 minutes)

### 7.1 Add a Sales Rep
1. In Manager Dashboard, click **+ Add Team Member**
2. Fill in:

```
Name: Sales Rep 1
Phone: 7777777777
Role: Sales Representative
PIN: 1111
```

3. Click **Add Member**

### 7.2 Add a Staff Member
1. Click **+ Add Team Member** again
2. Fill in:

```
Name: Staff Member 1
Phone: 6666666666
Role: Staff
PIN: 2222
```

3. Click **Add Member**

### 7.3 Verify
Both should appear in the team table with:
- Name, Phone, Role
- Stats showing 0 leads initially

---

## Step 8: Test Sales Rep (2 minutes)

### 8.1 Login as Sales Rep
1. Logout from manager account
2. Login with:
   - Phone: `7777777777`
   - PIN: `1111`
3. Should redirect to `/dashboard`

### 8.2 Create a Test Lead
1. Click **+ New Lead** button
2. Fill in lead details:
   - Customer Name: Test Customer
   - Phone: 9999888877
   - Status: Lost (for testing)
   - Category: Electric
   - Deal Size: 50000
   - Model: (type any model name)
   - Purchase Timeline: 3_days
   - Reason: price_high
   - Rating: 4 stars

3. Submit the lead

---

## Step 9: Verify Everything Works (2 minutes)

### 9.1 Check Manager Dashboard
1. Logout from sales rep
2. Login as manager (8888888888 / 5678)
3. You should now see:
   - Team Members: 2
   - Total Leads: 1
   - Sales Rep 1 has 1 lead in the table

### 9.2 Check Super Admin Dashboard
1. Logout from manager
2. Login as super admin (9999999999 / 1234)
3. You should see:
   - Total Organizations: 1
   - Total Users: 3 (super admin + manager + sales rep + staff)
   - Total Leads: 1
   - Organization "My Company" in the list

---

## ✅ Complete Setup Verification Checklist

Run these SQL queries in Supabase to verify everything:

```sql
-- 1. Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Should show: categories, leads, models, organizations, otp_verifications,
--              role_permissions, system_settings, users, whatsapp_logs

-- 2. Check users and roles
SELECT name, phone, role FROM users ORDER BY created_at;
-- Should show:
-- Super Admin | 9999999999 | super_admin
-- John Manager | 8888888888 | manager
-- Sales Rep 1 | 7777777777 | sales_rep
-- Staff Member 1 | 6666666666 | staff

-- 3. Check role permissions
SELECT role, COUNT(*) as permission_count
FROM role_permissions
GROUP BY role
ORDER BY role;
-- Should show:
-- manager: 10
-- sales_rep: 6
-- staff: 7
-- super_admin: 25

-- 4. Check organization created
SELECT name, contact_number FROM organizations;
-- Should show: My Company | 9876543210

-- 5. Check default categories
SELECT name FROM categories ORDER BY name;
-- Should show: Electric, Geared, Kids, Premium Geared, Single Speed

-- 6. Check team assignments
SELECT u.name, u.role, m.name as manager_name
FROM users u
LEFT JOIN users m ON u.manager_id = m.id
WHERE u.role IN ('staff', 'sales_rep');
-- Should show both team members assigned to John Manager

-- 7. Check leads
SELECT customer_name, status, deal_size
FROM leads;
-- Should show: Test Customer | lost | 50000
```

---

## 🎯 What You Now Have

### Users Created:
| Role | Name | Phone | PIN | Dashboard |
|------|------|-------|-----|-----------|
| Super Admin | Super Admin | 9999999999 | 1234 | System-wide management |
| Manager | John Manager | 8888888888 | 5678 | Team management |
| Sales Rep | Sales Rep 1 | 7777777777 | 1111 | Lead creation |
| Staff | Staff Member 1 | 6666666666 | 2222 | Lead creation |

### Database Structure:
- ✅ 9 tables created
- ✅ 25 permissions defined
- ✅ 4 role hierarchy established
- ✅ RLS policies active
- ✅ 1 organization created
- ✅ 5 default categories created

### Features Working:
- ✅ Super admin can create organizations
- ✅ Manager can add team members
- ✅ Sales reps can create leads
- ✅ Team stats show in manager dashboard
- ✅ Role-based access control working
- ✅ Permission system enforced

---

## 🚀 You're Ready to Use the System!

### Next Steps:

1. **Add More Team Members**
   - Login as manager and add more sales reps/staff

2. **Create More Leads**
   - Login as sales reps and create win/lost leads

3. **Test Permissions**
   - Try accessing endpoints you shouldn't have access to
   - Verify permissions work correctly

4. **Customize Categories**
   - Add your own product categories
   - Add models under each category

5. **Proceed to Phase 2.2**
   - Target Setting System
   - See main Phase 2 prompt for details

---

## 🐛 Troubleshooting

### Issue: "relation does not exist" error
**Solution:** You skipped Step 1. Run `00-initial-schema.sql` first.

### Issue: "invalid role" error
**Solution:** You skipped Step 2. Run `phase-2.1-role-hierarchy.sql` migration.

### Issue: Can't login as super admin
**Solution:**
- Check PIN hash was generated and pasted correctly
- Verify phone number is exactly `9999999999`
- Clear browser localStorage and try again

### Issue: Organization creation fails
**Solution:**
- Check that migration ran successfully
- Verify super_admin user exists
- Check browser console for error messages

### Issue: Manager can't see team members
**Solution:**
- Verify team members have `manager_id` set
- Check they're in the same organization
- Run SQL query to verify: `SELECT * FROM users WHERE manager_id IS NOT NULL;`

---

## 📞 Quick Commands Reference

### Generate PIN Hash
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PIN', 10).then(console.log);"
```

### Start Dev Server
```bash
cd "e:\2xg\Lead-CRM(2xgearn)\lead-CRM"
npm run dev
```

### Check Logs
- Browser: F12 → Console tab
- Supabase: Dashboard → Logs section

---

## ✨ Success Criteria

You're set up correctly when:
- [ ] All 9 tables exist in Supabase
- [ ] 4 users created (super admin, manager, sales rep, staff)
- [ ] 25 permissions in role_permissions table
- [ ] 1 organization created
- [ ] 5 default categories created
- [ ] All users can login
- [ ] Role-based dashboards work
- [ ] Manager can see team stats
- [ ] Sales rep can create leads

---

**🎉 Congratulations!** Your Lead CRM with Phase 2.1 Role Hierarchy is fully set up and running!

**Total Setup Time:** ~20 minutes
**Status:** ✅ Production Ready

For detailed feature documentation, see:
- `README-PHASE-2.1.md` - Main documentation
- `PHASE-2.1-IMPLEMENTATION-GUIDE.md` - Detailed guide
- `QUICK-START.md` - Quick reference

**Ready for Phase 2.2?** Check the main Phase 2 prompt for Target Setting System!
