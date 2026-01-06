# Instructions for arsalan507 to Update Repository

## Option 1: Merge Pull Request on GitHub (Easiest)

1. Go to https://github.com/arsalan507/lead-CRM/pulls
2. Find and review the PR from Zaheer7779
3. **IMPORTANT**: Run database migration first (see below)
4. Click "Merge pull request"
5. Confirm merge

---

## Option 2: Pull Changes Directly Using Git

If you want to pull the changes directly to your local repository:

### Step 1: Add Zaheer's fork as a remote
```bash
cd /path/to/your/lead-CRM
git remote add zaheer https://github.com/Zaheer7779/lead-CRM.git
git fetch zaheer
```

### Step 2: Review the changes
```bash
# See what changes are in the branch
git log main..zaheer/feature/google-review-qr-and-category-management

# See the actual code changes
git diff main...zaheer/feature/google-review-qr-and-category-management
```

### Step 3: Merge the changes
```bash
# Make sure you're on main branch
git checkout main

# Merge Zaheer's changes
git merge zaheer/feature/google-review-qr-and-category-management

# Push to GitHub
git push origin main
```

### Step 4: Clean up (optional)
```bash
# Remove the remote if no longer needed
git remote remove zaheer
```

---

## CRITICAL: Database Migration Required

**BEFORE** deploying or testing these changes, you MUST run this SQL in your Supabase SQL Editor:

```sql
-- Add google_review_qr_url column to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS google_review_qr_url TEXT;

-- Add comment
COMMENT ON COLUMN organizations.google_review_qr_url IS 'URL to the Google Review QR code image shown on Win lead success page';

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name = 'google_review_qr_url';
```

Or you can run the complete migration file:
- Location: `supabase/migrations/add-google-review-qr.sql`

---

## What's Included in This Update

### New Features
1. **Google Review QR Code Management**
   - Admins can upload custom QR codes in Settings
   - QR codes display on successful sale completion
   - Base64 storage, file validation (type & size)

2. **Category Deletion**
   - Admins can delete categories
   - Confirmation dialog before deletion
   - Proper authorization checks

3. **Enhanced UI**
   - Gradient headers in Settings
   - Improved category list styling
   - Better hover effects and spacing

### Files Changed
- `app/admin/settings/page.tsx` (QR upload, category deletion UI)
- `app/api/admin/organization/route.ts` (QR code handling)
- `components/LeadForm/WinSuccess.tsx` (Dynamic QR display)
- `lib/types.ts` (Type definitions)

### Files Added
- `supabase/migrations/add-google-review-qr.sql` (Database migration)
- `app/api/categories/[id]/route.ts` (DELETE endpoint)
- `MY_UPDATES.md` (Full documentation)

---

## Testing After Merge

1. **Install dependencies** (if needed):
   ```bash
   npm install
   ```

2. **Build and run**:
   ```bash
   npm run dev
   ```

3. **Test the features**:
   - Login as admin
   - Go to Settings page
   - Try uploading a Google Review QR code
   - Create and delete a category
   - Create a won lead and verify QR code appears

---

## Deployment to Production

### For Vercel:
1. The changes will auto-deploy once merged to main (if auto-deploy is enabled)
2. Make sure to run the database migration in production Supabase

### For Other Platforms:
1. Pull the latest changes
2. Run database migration in production
3. Build: `npm run build`
4. Deploy the build

---

## Need Help?

- Full documentation: See `MY_UPDATES.md` in the repository
- Contact: Zaheer7779 on GitHub

---

**Created**: January 5, 2026
**Pull Request**: https://github.com/arsalan507/lead-CRM/pulls
