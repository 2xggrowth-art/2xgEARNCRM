# ✅ Coolify Deployment Verification Checklist

Use this checklist to verify your Coolify deployment is working correctly.

---

## 📋 Pre-Deployment Verification

- [x] Dockerfile created and tested
- [x] next.config.ts updated with standalone output
- [x] .dockerignore added
- [x] Production build successful
- [x] Changes committed to Git
- [x] Changes pushed to GitHub
- [ ] Coolify server accessible
- [ ] GitHub repository URL ready
- [ ] Supabase credentials copied from Vercel

---

## 🚀 During Deployment

### In Coolify:

- [ ] Application created in Coolify
- [ ] Repository URL configured
- [ ] Branch set to `main`
- [ ] Build method set to Docker
- [ ] Port set to 3000 (or auto-detected)

### Environment Variables Set:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` (build + runtime)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (build + runtime)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (runtime)
- [ ] `JWT_SECRET` (runtime)
- [ ] `CRON_SECRET` (runtime)
- [ ] `NODE_ENV=production` (runtime)

### Deployment Progress:

- [ ] Build started successfully
- [ ] Dependencies installed
- [ ] Next.js build completed
- [ ] Docker image created
- [ ] Container started
- [ ] Health check passed
- [ ] Domain/URL assigned

---

## ✅ Post-Deployment Verification

### 1. Application Accessibility

```bash
# Test main domain
curl -I https://your-coolify-domain.com
# Expected: 200 OK
```

- [ ] Main URL accessible
- [ ] Login page loads
- [ ] Static assets loading (CSS, JS, images)
- [ ] No 404 errors in browser console

### 2. Authentication & Authorization

- [ ] Login page displays correctly
- [ ] Can login with existing credentials
- [ ] JWT token created in cookies
- [ ] User redirected to dashboard after login
- [ ] Logout works correctly
- [ ] Protected routes require authentication

**Test Commands:**
```bash
# Should redirect to login
curl -I https://your-coolify-domain.com/dashboard

# Should return 401
curl https://your-coolify-domain.com/api/admin/team
```

### 3. Database Connectivity

- [ ] Dashboard loads data from Supabase
- [ ] Can view existing leads
- [ ] Can create new leads
- [ ] Can update lead status
- [ ] Can delete leads
- [ ] All CRUD operations working

**Test in Browser:**
1. Login as admin
2. Go to Dashboard
3. Check if leads are displayed
4. Try creating a test lead
5. Try updating a lead status
6. Verify changes persist

### 4. API Endpoints

Test key API endpoints:

```bash
# Replace YOUR_COOLIFY_DOMAIN and add auth cookie/token
curl https://your-coolify-domain.com/api/admin/organization
curl https://your-coolify-domain.com/api/leads/my-leads
curl https://your-coolify-domain.com/api/categories
```

- [ ] `/api/auth/login` - Authentication working
- [ ] `/api/admin/organization` - Organization data loads
- [ ] `/api/leads/my-leads` - Leads API working
- [ ] `/api/categories` - Categories load
- [ ] `/api/admin/team` - Team management working

### 5. WhatsApp Integration

- [ ] WhatsApp settings page accessible
- [ ] Can view current WhatsApp configuration
- [ ] Provider selection working (Meta / Whatstool)
- [ ] Can save WhatsApp credentials
- [ ] Test sending WhatsApp message (if configured)

**Test:**
1. Go to Settings → WhatsApp Integration
2. Verify current configuration displays
3. Try toggling active/inactive
4. If you have test credentials, try sending a test message

### 6. File Uploads

- [ ] Organization logo upload working
- [ ] Images display correctly
- [ ] File validation working

### 7. Middleware & Security

- [ ] Unauthenticated users redirected to login
- [ ] API routes return 401 without auth
- [ ] Role-based access control working
- [ ] JWT verification working
- [ ] Session cookies secure

### 8. Performance

- [ ] Page load time < 3 seconds
- [ ] API response time < 1 second
- [ ] No memory leaks in logs
- [ ] CPU usage normal (check Coolify metrics)

---

## 🕐 Cron Job Verification

After setting up cron (see COOLIFY_CRON_SETUP.md):

- [ ] Cron service configured (GitHub Actions / cron-job.org / etc.)
- [ ] CRON_SECRET set in cron service
- [ ] Test cron endpoint manually:

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-coolify-domain.com/api/cron/auto-expire-leads
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully expired X leads",
  "data": { "expiredCount": X }
}
```

- [ ] Cron runs on schedule (check after 24 hours)
- [ ] Leads auto-expire correctly
- [ ] No errors in application logs

---

## 📊 Monitoring & Logs

### Check Application Logs:

In Coolify:
1. Go to your application
2. Click "Logs" tab
3. Look for:
   - [ ] No uncaught exceptions
   - [ ] No database connection errors
   - [ ] No JWT verification errors
   - [ ] Successful API requests logged

### Common Log Patterns to Look For:

✅ **Good:**
```
[INFO] User authenticated successfully
[INFO] Lead created successfully
[INFO] WhatsApp message sent
```

❌ **Bad (investigate if seen):**
```
[ERROR] Cannot connect to Supabase
[ERROR] JWT verification failed
[ERROR] Database query failed
[ERROR] Missing environment variable
```

---

## 🔒 Security Verification

- [ ] HTTPS enabled (green padlock in browser)
- [ ] SSL certificate valid
- [ ] Environment variables not exposed in client code
- [ ] No sensitive data in logs
- [ ] CORS configured correctly
- [ ] Rate limiting working (if configured)

---

## 🎯 User Acceptance Testing

Have actual users test:

- [ ] Admin can manage organization settings
- [ ] Managers can view team performance
- [ ] Staff can create and update leads
- [ ] Customers can view their lead status (if applicable)
- [ ] Mobile responsiveness working
- [ ] All user workflows functional

---

## 🆘 Rollback Plan (If Issues)

If critical issues found:

### Option 1: Keep Vercel Active
- [ ] Vercel deployment still active as fallback
- [ ] Can point DNS back to Vercel immediately

### Option 2: Redeploy Previous Version
```bash
# In Coolify, redeploy previous commit
git log  # Find previous commit hash
# In Coolify: Deploy specific commit
```

### Option 3: Debug on Coolify
- [ ] Check environment variables
- [ ] Review build logs
- [ ] Check container logs
- [ ] Verify Supabase connectivity
- [ ] Test manually with curl

---

## ✅ Deployment Success Criteria

Mark deployment as successful when:

- [x] All "Post-Deployment Verification" items checked
- [x] No critical errors in logs (24 hours monitoring)
- [x] Users can perform all key workflows
- [x] Performance acceptable (< 3s page load)
- [x] Cron job running successfully
- [x] No data loss or corruption
- [x] Backup/rollback plan in place

---

## 📞 Next Steps After Success

Once deployment verified:

1. **Update DNS (if needed)**
   - Point production domain to Coolify
   - Update any hardcoded URLs

2. **Monitor for 48 Hours**
   - Check logs daily
   - Monitor performance metrics
   - Watch for user-reported issues

3. **Decommission Vercel (Optional)**
   - Keep Vercel as backup for 1 week
   - Cancel Vercel subscription if no longer needed
   - Update documentation

4. **Setup Monitoring**
   - Add uptime monitoring (UptimeRobot, Better Stack)
   - Configure alerts for downtime
   - Setup log aggregation if needed

5. **Plan Phase 2 (Future)**
   - Consider self-hosting Supabase
   - Plan data migration strategy
   - Evaluate resource requirements

---

## 🎉 Deployment Complete!

If all items above are checked, your Coolify deployment is successful!

**Your application is now running on Coolify with the same Supabase backend.**

---

## 📝 Notes

Record any issues encountered and solutions:

```
Issue:
Solution:
Date:

Issue:
Solution:
Date:
```

---

**Congratulations on successfully migrating to Coolify! 🎊**
