# Coolify Deployment Guide - Lead CRM

## 🎯 Overview
This guide covers deploying your Lead CRM application from Vercel to Coolify on OVH VPS.

**IMPORTANT:** This is Phase 1 - Application migration only. Supabase remains external and unchanged.

---

## ✅ Pre-Deployment Checklist

- [ ] Coolify installed on OVH VPS
- [ ] GitHub repository accessible
- [ ] Supabase credentials ready (same as Vercel)
- [ ] Domain/subdomain configured (optional)

---

## 📋 Step 1: Push Changes to GitHub

```bash
# Commit the Coolify-specific changes
git add -A
git commit -m "Add Coolify deployment configuration (Dockerfile, standalone build)"
git push origin main
```

---

## 🚀 Step 2: Create Application in Coolify

### 2.1 Add New Resource
1. Login to your Coolify dashboard
2. Click **"+ New"** → **"Application"**
3. Select **"Public Repository"**

### 2.2 Repository Configuration
- **Repository URL:** `https://github.com/YOUR_USERNAME/lead-CRM` (replace with your actual repo)
- **Branch:** `main`
- **Build Pack:** Docker (or Auto-detect - it should find the Dockerfile)

### 2.3 Build Configuration
Coolify should auto-detect from Dockerfile, but verify:
- **Port:** 3000 (auto-detected from Dockerfile EXPOSE)
- **Build Command:** `docker build -t app .`
- **Start Command:** Handled by Dockerfile CMD

---

## 🔐 Step 3: Configure Environment Variables

In Coolify, go to your application → **Environment Variables** tab and add:

### Required Variables:
```env
# Supabase Configuration (SAME as Vercel - DO NOT CHANGE)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Secret (SAME as Vercel - MUST match for existing sessions to work)
JWT_SECRET=your-existing-jwt-secret-from-vercel

# Cron Secret (SAME as Vercel)
CRON_SECRET=your-existing-cron-secret-from-vercel

# Node Environment
NODE_ENV=production
```

### ⚠️ CRITICAL: Use Existing Values!
- Copy **EXACT** values from your Vercel environment variables
- DO NOT generate new JWT_SECRET (existing user sessions will break)
- DO NOT change Supabase credentials

### How to Get Values from Vercel:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Copy each value exactly as-is

---

## 🔧 Step 4: Build-Time Variables

**IMPORTANT:** `NEXT_PUBLIC_*` variables must be available at **build time**.

In Coolify, mark these as **Build Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(They should also be set as runtime variables)

---

## 🚢 Step 5: Deploy

1. Click **"Deploy"** in Coolify
2. Wait for build to complete (2-5 minutes)
3. Monitor build logs for errors
4. Once deployed, note your application URL

---

## ✅ Step 6: Verify Deployment

### 6.1 Check Application Health
Visit: `https://your-coolify-domain.com`

You should see the login page.

### 6.2 Test Login
Try logging in with existing credentials. If login works, JWT and Supabase are configured correctly.

### 6.3 Test API Endpoints
```bash
# Health check (should return data from Supabase)
curl https://your-coolify-domain.com/api/admin/organization

# Protected route (should return 401 without auth)
curl https://your-coolify-domain.com/dashboard
```

---

## 🕐 Step 7: Setup Cron Job

**Important:** Vercel Cron doesn't work on Coolify. Choose one option:

See [COOLIFY_CRON_SETUP.md](./COOLIFY_CRON_SETUP.md) for detailed instructions.

**Quick Setup (GitHub Actions - Recommended):**
1. Create `.github/workflows/cron.yml` (see COOLIFY_CRON_SETUP.md)
2. Add `CRON_SECRET` to GitHub repo secrets
3. Push to GitHub
4. Cron will run daily at midnight UTC

---

## 🔍 Troubleshooting

### Build Fails
**Error:** "Cannot find module..."
- **Solution:** Check package.json dependencies are correct
- **Solution:** Clear Coolify build cache and rebuild

**Error:** "NEXT_PUBLIC_SUPABASE_URL is not defined"
- **Solution:** Ensure build-time variables are set in Coolify
- **Solution:** Mark `NEXT_PUBLIC_*` vars as "Available at build time"

### Application Won't Start
**Error:** Port already in use
- **Solution:** Coolify handles this automatically, but check port configuration is 3000

**Error:** "Cannot connect to Supabase"
- **Solution:** Verify Supabase credentials are correct
- **Solution:** Check Supabase project is not paused

### Login Doesn't Work
**Error:** "Invalid session"
- **Solution:** Ensure JWT_SECRET matches exactly from Vercel
- **Solution:** Users may need to re-login if JWT_SECRET was changed

### Database Queries Fail
**Error:** "Relation does not exist" or RLS errors
- **Solution:** Verify SUPABASE_SERVICE_ROLE_KEY is correct
- **Solution:** Check Supabase RLS policies are active

---

## 🔄 Updating the Application

After pushing changes to GitHub:
1. Go to Coolify dashboard
2. Click **"Redeploy"**
3. Or enable **auto-deploy on push** in Coolify settings

---

## 📊 Monitoring

### View Logs
In Coolify:
- Go to your application
- Click **"Logs"** tab
- Monitor for errors

### Check Application Health
```bash
# Should return 200 OK
curl -I https://your-coolify-domain.com

# Check API health
curl https://your-coolify-domain.com/api/admin/stats
```

---

## 🔒 Security Notes

1. **HTTPS:** Coolify provides automatic SSL via Let's Encrypt (enable in settings)
2. **Firewall:** Ensure OVH VPS firewall allows ports 80 and 443
3. **Environment Variables:** Never commit .env files to Git
4. **Secrets Rotation:** Plan to rotate JWT_SECRET and CRON_SECRET periodically (requires user re-login)

---

## 🎉 Migration Complete!

Your application is now running on Coolify with:
- ✅ Same Supabase database (no data migration)
- ✅ Same authentication system
- ✅ Same environment variables
- ✅ Dockerized for better isolation and scalability

---

## 📞 Need Help?

- **Coolify Docs:** https://coolify.io/docs
- **Next.js Docker Docs:** https://nextjs.org/docs/deployment#docker-image
- **Supabase Docs:** https://supabase.com/docs

---

## 🔮 Next Steps (Phase 2 - Future)

After Coolify is stable, you may consider:
- Self-hosting Supabase on the same VPS (requires more resources)
- Setting up automated backups
- Configuring custom domain
- Adding monitoring/alerting (e.g., Uptime Robot, Better Stack)
