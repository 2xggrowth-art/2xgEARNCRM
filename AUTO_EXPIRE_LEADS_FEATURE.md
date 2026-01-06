# Auto-Expire Leads Feature

## Overview
This feature automatically marks Lost leads with an auto-expire note if they haven't been updated within 30 days past their expected purchase timeline. This helps identify leads that have gone cold and never followed through on their intended purchase.

---

## How It Works

### Automatic Processing
- **Runs Daily**: The cron job runs at midnight every day (00:00 UTC)
- **Targets Lost Leads**: Only processes leads with status 'lost'
- **30-Day Window**: Checks for leads not updated in the last 30 days
- **Purchase Timeline Filter**: Only affects leads with future timelines (3 days, 7 days, 30 days)
- **One-Time Update**: Won't re-process leads already marked as auto-expired

### What Gets Updated
When a lead is auto-expired:
- `not_today_reason` → Changed to `'other'`
- `other_reason` → Updated to `'Auto-expired: No follow-up within 30 days of expected purchase timeline'`
- `updated_at` → Set to current timestamp
- `status` → Remains `'lost'` (not changed)

---

## Files Created

### 1. API Endpoint
**Location**: `app/api/cron/auto-expire-leads/route.ts`

**Purpose**: Processes and marks leads as auto-expired

**Access**: Protected by Bearer token (`CRON_SECRET` environment variable)

**Method**: GET

**Example Request**:
```bash
curl -X GET https://your-domain.com/api/cron/auto-expire-leads \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully expired 5 leads",
  "data": {
    "expiredCount": 5,
    "leads": [...]
  }
}
```

### 2. Cron Configuration
**Location**: `vercel.json`

**Schedule**: `0 0 * * *` (Daily at midnight UTC)

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-expire-leads",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## Setup Instructions

### 1. Environment Variable (Required)

Add the `CRON_SECRET` to your environment variables:

**Vercel**:
1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: A secure random string (e.g., generate with: `openssl rand -base64 32`)
   - **Environment**: Production, Preview, Development

**Local Development (.env.local)**:
```bash
CRON_SECRET=your-secret-key-here
```

### 2. Vercel Cron Setup

**Vercel Pro/Team Plan** (Automatic):
- Cron jobs run automatically when deployed to Vercel
- No additional configuration needed
- Monitor in Vercel Dashboard → Deployments → Cron Jobs

**Vercel Hobby Plan** (Manual Setup):
Vercel Hobby doesn't support cron jobs. Use an external service:

#### Option A: GitHub Actions (Free)
Create `.github/workflows/cron-auto-expire.yml`:
```yaml
name: Auto-Expire Leads Cron

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  cron:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Auto-Expire
        run: |
          curl -X GET https://your-domain.vercel.app/api/cron/auto-expire-leads \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Add `CRON_SECRET` to GitHub Secrets:
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. New repository secret: `CRON_SECRET`

#### Option B: EasyCron (Free Tier)
1. Sign up at https://www.easycron.com
2. Create new cron job:
   - **URL**: `https://your-domain.vercel.app/api/cron/auto-expire-leads`
   - **Schedule**: Daily at midnight
   - **HTTP Headers**:
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```

#### Option C: cron-job.org (Free)
1. Sign up at https://cron-job.org
2. Create new cron job:
   - **URL**: `https://your-domain.vercel.app/api/cron/auto-expire-leads`
   - **Schedule**: `0 0 * * *`
   - **Request Headers**:
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```

---

## Testing

### Manual Test
You can manually trigger the cron job to test it:

```bash
curl -X GET http://localhost:3001/api/cron/auto-expire-leads \
  -H "Authorization: Bearer your-cron-secret"
```

### Test Scenarios

1. **Create a Test Lead**:
   - Create a Lost lead with purchase_timeline = '3_days'
   - Manually update `updated_at` to 31 days ago in database

2. **Run Cron**:
   - Trigger the endpoint
   - Check response for `expiredCount`

3. **Verify Update**:
   - Check the lead in database
   - `other_reason` should contain "Auto-expired"

### SQL Test Query
```sql
-- Create a test lead (old enough to expire)
UPDATE leads
SET updated_at = NOW() - INTERVAL '31 days'
WHERE status = 'lost'
  AND purchase_timeline IN ('3_days', '7_days', '30_days')
  AND other_reason NOT LIKE '%Auto-expired%'
LIMIT 1;

-- After running cron, verify the update
SELECT
  id,
  customer_name,
  status,
  purchase_timeline,
  not_today_reason,
  other_reason,
  updated_at
FROM leads
WHERE other_reason LIKE '%Auto-expired%';
```

---

## Monitoring

### Check Logs

**Vercel**:
1. Go to your project
2. Click on a deployment
3. View "Functions" logs
4. Search for "[Auto-Expire]"

**Expected Log Output**:
```
[Auto-Expire] Checking for Lost leads older than 2025-12-07T00:00:00.000Z that haven't converted
[Auto-Expire] Found 3 leads to mark as auto-expired
[Auto-Expire] Successfully expired 3 leads
```

### Cron Job Status

**Vercel Pro/Team**:
- Dashboard → Your Project → Cron Jobs
- View execution history and success/failure status

**External Services**:
- Check your cron service dashboard (GitHub Actions, EasyCron, etc.)
- Monitor HTTP response codes (200 = success)

---

## Database Impact

### Query Performance
The cron job runs a single efficient query:
```sql
SELECT ... FROM leads
WHERE status = 'lost'
  AND updated_at < '30_days_ago'
  AND purchase_timeline IN ('3_days', '7_days', '30_days')
  AND other_reason NOT LIKE '%Auto-expired%'
```

**Recommended Index** (Optional, for better performance):
```sql
CREATE INDEX idx_leads_auto_expire
ON leads(status, updated_at, purchase_timeline)
WHERE status = 'lost';
```

### Data Changes
- Updates only `not_today_reason`, `other_reason`, and `updated_at`
- Does not change `status`, `created_at`, or any other fields
- Preserves all original lead data

---

## Security

### Authorization
- **Bearer Token**: Requires `CRON_SECRET` in Authorization header
- **Environment Variable**: Secret must match exactly
- **Unauthorized Access**: Returns 401 error if token is missing or invalid

### Best Practices
1. **Strong Secret**: Use a cryptographically random string (32+ characters)
2. **Keep Secret**: Never commit `CRON_SECRET` to version control
3. **Rotate Regularly**: Change the secret periodically
4. **Monitor Logs**: Watch for unauthorized access attempts

---

## Troubleshooting

### Cron Job Not Running

**Check**:
1. Vercel plan supports cron jobs (Pro/Team required)
2. `vercel.json` is in the root directory
3. Deployment was successful after adding cron config
4. Check Vercel logs for errors

**Solution**: Use external cron service (GitHub Actions, EasyCron)

### 401 Unauthorized Error

**Check**:
1. `CRON_SECRET` environment variable is set
2. Authorization header format: `Bearer YOUR_SECRET`
3. Secret matches in both Vercel and cron service

**Solution**: Regenerate secret and update in all places

### No Leads Being Expired

**Check**:
1. Are there Lost leads older than 30 days?
2. Do they have future purchase timelines (not 'today')?
3. Have they already been auto-expired?

**Solution**: Check database query and logs

### Leads Expired Too Early

**Issue**: Leads are being marked as expired before 30 days

**Check**: Server timezone vs. UTC (cron runs in UTC)

**Solution**: Ensure consistent timezone handling

---

## Future Enhancements

Potential improvements:
1. **Configurable Window**: Allow custom expiry period (not just 30 days)
2. **Email Notifications**: Alert admin when leads are auto-expired
3. **Re-engagement**: Automatically send WhatsApp reminder before expiring
4. **Dashboard Widget**: Show count of expiring leads in admin dashboard
5. **Undo Feature**: Allow admin to "un-expire" leads
6. **Custom Reasons**: Different messages based on purchase_timeline
7. **Statistics**: Track auto-expire trends over time

---

## API Reference

### GET /api/cron/auto-expire-leads

**Description**: Automatically mark stale Lost leads as auto-expired

**Authentication**: Bearer token in Authorization header

**Headers**:
```
Authorization: Bearer YOUR_CRON_SECRET
```

**Response 200** (Success):
```json
{
  "success": true,
  "message": "Successfully expired 5 leads",
  "data": {
    "expiredCount": 5,
    "leads": [
      {
        "id": "uuid",
        "customer_name": "John Doe",
        "status": "lost",
        "other_reason": "Auto-expired: No follow-up within 30 days of expected purchase timeline",
        ...
      }
    ]
  }
}
```

**Response 200** (No Leads):
```json
{
  "success": true,
  "message": "No leads to expire",
  "data": {
    "expiredCount": 0
  }
}
```

**Response 401** (Unauthorized):
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Response 500** (Server Error):
```json
{
  "success": false,
  "error": "Failed to fetch expired leads"
}
```

---

**Created**: January 6, 2026
**Status**: ✅ Ready for Deployment
**Migration Required**: NO
**Environment Variables Required**: YES (`CRON_SECRET`)
