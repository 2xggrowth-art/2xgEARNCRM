# Cron Job Setup for Coolify Deployment

## Overview
Your application has a cron job that auto-expires leads after 30 days. This was configured in Vercel using `vercel.json`, but Coolify requires a different approach.

## Cron Job Details
- **Endpoint:** `/api/cron/auto-expire-leads`
- **Schedule:** Daily at midnight (0 0 * * *)
- **Authentication:** Requires `Authorization: Bearer <CRON_SECRET>` header

## Setup Options

### Option 1: External Cron Service (Recommended)
Use a service like **cron-job.org**, **EasyCron**, or **GitHub Actions** to call your endpoint daily.

**Example using cron-job.org:**
1. Sign up at https://cron-job.org
2. Create new cron job:
   - URL: `https://your-coolify-domain.com/api/cron/auto-expire-leads`
   - Schedule: `0 0 * * *` (daily at midnight)
   - Request method: GET
   - Add header: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 2: GitHub Actions (Free)
Add this file to your repository at `.github/workflows/cron.yml`:

```yaml
name: Daily Lead Expiration Cron

on:
  schedule:
    # Runs daily at midnight UTC
    - cron: '0 0 * * *'
  workflow_dispatch: # Allow manual triggering

jobs:
  expire-leads:
    runs-on: ubuntu-latest
    steps:
      - name: Call Cron Endpoint
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-coolify-domain.com/api/cron/auto-expire-leads
```

**Setup:**
1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Add secret: `CRON_SECRET` with your cron secret value
3. Update the URL in the workflow file
4. Commit and push

### Option 3: OVH Server Cron (If you have SSH access)
SSH into your OVH VPS and add to crontab:

```bash
# Edit crontab
crontab -e

# Add this line (replace with your actual URL and secret)
0 0 * * * curl -X GET -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-coolify-domain.com/api/cron/auto-expire-leads
```

### Option 4: Coolify Scheduled Tasks (If Available)
Check if your Coolify version supports scheduled tasks in the application settings. If so, configure it there directly.

## Testing the Cron Job

Test manually before setting up automation:

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-coolify-domain.com/api/cron/auto-expire-leads
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully expired X leads",
  "data": {
    "expiredCount": X,
    "leads": [...]
  }
}
```

## Security Notes
- Never commit your CRON_SECRET to Git
- Set CRON_SECRET in Coolify environment variables
- Use the same secret value in your cron service configuration
- Monitor your application logs to ensure the cron runs successfully
