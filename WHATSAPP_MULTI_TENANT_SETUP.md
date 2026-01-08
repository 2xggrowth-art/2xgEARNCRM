# Multi-Tenant WhatsApp Integration - Complete Setup Guide

## ✅ What's Been Implemented

Your lead-CRM now has a **complete multi-tenant WhatsApp integration** where each shop owner can use their own WhatsApp Cloud API credentials without code changes.

### Features:
1. ✅ **Admin Settings UI** - WhatsApp section in `/admin/settings`
2. ✅ **Dynamic Credentials** - Each organization uses their own API keys
3. ✅ **Template Fetching** - Fetch approved templates from Meta API
4. ✅ **Secure Storage** - Credentials stored with RLS (Row Level Security)
5. ✅ **Lost Lead Button** - WhatsApp button on lost lead success screen
6. ✅ **Server Actions** - TypeScript server actions for sending messages

---

## 🚀 Quick Start

### Step 1: Create Database Table

Run the migration to create the `whatsapp_credentials` table:

```bash
cd lead-CRM

# Option 1: Using psql (if you have PostgreSQL CLI)
psql YOUR_SUPABASE_DATABASE_URL -f supabase/migrations/create_whatsapp_credentials.sql

# Option 2: Copy and paste in Supabase SQL Editor
# Go to your Supabase project → SQL Editor → New Query
# Copy the contents of supabase/migrations/create_whatsapp_credentials.sql
# Paste and run it
```

### Step 2: Access Admin Settings

1. Start your development server (already running at http://localhost:3000)
2. Log in as an **admin** user
3. Navigate to **Settings** from the admin dashboard
4. Scroll down to see the **WhatsApp Cloud API Settings** section

### Step 3: Get Meta WhatsApp Credentials

Each shop owner needs to get their own credentials from Meta:

1. **Create Meta Business Account**
   - Go to https://business.facebook.com
   - Create or log into your business account

2. **Set Up WhatsApp Business API**
   - Go to https://developers.facebook.com
   - Create a new app or select existing
   - Add "WhatsApp" product to your app

3. **Get Your Credentials**
   - Navigate to WhatsApp → API Setup
   - Copy these 3 values:
     - **Access Token** (Generate a permanent token)
     - **Phone Number ID**
     - **WhatsApp Business Account ID (WABA ID)**

### Step 4: Configure in Admin Settings

1. In your admin settings page, enter the 3 credentials
2. Optionally add phone number and business name for display
3. Click **"Fetch My Approved Templates"**
4. Select your preferred template for lost leads
5. Click **"Save WhatsApp Settings"**

---

## 📋 How It Works

### Database Structure

```sql
whatsapp_credentials
├── id (UUID)
├── organization_id (FK) → Each organization has their own credentials
├── whatsapp_access_token
├── phone_number_id
├── waba_id
├── phone_number (optional display)
├── business_name (optional)
├── is_active (toggle on/off)
└── timestamps
```

**Security:**
- Row Level Security (RLS) enabled
- Users can only see/update their own organization's credentials
- Admin/Owner role required to modify

### Template Fetching Flow

```
Admin Settings Page
  ↓
Click "Fetch Templates"
  ↓
Calls Meta API: GET /v18.0/{waba_id}/message_templates
  ↓
Filters for APPROVED templates only
  ↓
Displays in dropdown
  ↓
Admin selects template for lost leads
  ↓
Saves to database
```

### Message Sending Flow

```
Lost Lead Created
  ↓
Success Screen Appears
  ↓
WhatsApp Button Visible
  ↓
User Clicks "Send Follow-up on WhatsApp"
  ↓
Server Action: sendWhatsAppMessage()
  ↓
Fetch credentials from whatsapp_credentials table
  ↓
POST to Meta Cloud API using organization's token
  ↓
Send template message with lead data
  ↓
Log to whatsapp_message_logs table
  ↓
Show success/error to user
```

---

## 🎯 Testing the Integration

### Test Checklist

- [ ] Database table created successfully
- [ ] Admin can access settings page
- [ ] Can enter and save WhatsApp credentials
- [ ] "Fetch Templates" button works and shows approved templates
- [ ] Can select a template from dropdown
- [ ] Settings save successfully
- [ ] Create a lost lead
- [ ] WhatsApp button appears on success screen
- [ ] Click button sends message successfully
- [ ] Message logged in `whatsapp_message_logs` table

### Test with Meta's Test Numbers

Before going live:
1. In Meta for Developers → WhatsApp → API Setup
2. Add test phone numbers
3. Send test messages to verify everything works
4. Once verified, remove test numbers and use real ones

---

## 📱 Using the WhatsApp Feature

### For Shop Owners (Admins)

1. **One-Time Setup:**
   - Get Meta WhatsApp credentials
   - Enter in Admin Settings
   - Fetch and select templates
   - Save settings

2. **Daily Use:**
   - Sales reps create leads as normal
   - When a lead is marked "Lost"
   - Success screen shows WhatsApp button
   - Click to instantly send follow-up message
   - Message uses shop owner's WhatsApp account

### For Sales Reps

1. Create lead and mark as "Lost"
2. Fill in all lead details
3. On success screen, see WhatsApp button
4. Click "Send Follow-up on WhatsApp"
5. Message sent automatically with customer name and reason

---

## 🔧 Customization Options

### Change Template Per Organization

Each organization can:
- Use different templates
- Use different languages
- Customize business name display
- Enable/disable WhatsApp feature

### Add More Templates

To support multiple templates (e.g., different messages for different reasons):

1. **Update UI**: Add template selector dropdown
2. **Update Component**: Pass template name as prop to WhatsAppButton
3. **Update Logic**: Map reason → template in LostSuccess component

Example:
```typescript
const getTemplateForReason = (reason: string) => {
  switch (reason) {
    case 'price_high':
      return 'lost_lead_price_concern';
    case 'need_family_approval':
      return 'lost_lead_needs_approval';
    default:
      return 'lost_lead_followup';
  }
};
```

---

## 🛡️ Security Best Practices

### Production Recommendations

1. **Encrypt Access Tokens**
   ```sql
   -- Add encryption extension
   CREATE EXTENSION IF NOT EXISTS pgcrypto;

   -- Encrypt tokens before storing
   UPDATE whatsapp_credentials
   SET whatsapp_access_token = pgp_sym_encrypt(
     whatsapp_access_token,
     current_setting('app.encryption_key')
   );
   ```

2. **Rotate Tokens Regularly**
   - Set up token expiration reminders
   - Generate new tokens every 60-90 days
   - Update in admin settings

3. **Monitor Usage**
   ```sql
   -- Check message volume
   SELECT
     organization_id,
     COUNT(*) as total_messages,
     COUNT(*) FILTER (WHERE status = 'sent') as successful,
     COUNT(*) FILTER (WHERE status = 'failed') as failed
   FROM whatsapp_message_logs
   WHERE sent_at >= NOW() - INTERVAL '30 days'
   GROUP BY organization_id;
   ```

4. **Set Rate Limits**
   - Implement rate limiting in server actions
   - Meta has its own rate limits (check Meta docs)
   - Add cooldown between messages

---

## 📊 Analytics Queries

### Organization WhatsApp Stats

```sql
-- Get WhatsApp usage by organization
SELECT
  o.name as organization_name,
  wc.phone_number,
  wc.business_name,
  wc.is_active,
  COUNT(wml.id) as total_messages_sent,
  COUNT(wml.id) FILTER (WHERE wml.status = 'sent') as successful,
  COUNT(wml.id) FILTER (WHERE wml.status = 'failed') as failed,
  MAX(wml.sent_at) as last_message_sent
FROM organizations o
LEFT JOIN whatsapp_credentials wc ON o.id = wc.organization_id
LEFT JOIN whatsapp_message_logs wml ON o.id = wml.organization_id
GROUP BY o.id, o.name, wc.phone_number, wc.business_name, wc.is_active
ORDER BY total_messages_sent DESC;
```

### Template Performance

```sql
-- Which templates are used most
SELECT
  template_name,
  COUNT(*) as times_used,
  COUNT(*) FILTER (WHERE status = 'sent') as successful,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'sent')::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as success_rate
FROM whatsapp_message_logs
GROUP BY template_name
ORDER BY times_used DESC;
```

---

## 🐛 Troubleshooting

### Error: "Could not find the table 'public.whatsapp_credentials'"

**Solution:** Run the database migration
```bash
psql YOUR_DATABASE_URL -f supabase/migrations/create_whatsapp_credentials.sql
```

### Error: "WhatsApp credentials not configured"

**Solution:**
1. Log in as admin
2. Go to Settings
3. Enter WhatsApp credentials
4. Save settings

### Error: "Template not found"

**Solution:**
1. Go to Meta Business Manager
2. Create message template
3. Wait for approval (24-48 hours)
4. Re-fetch templates in admin settings

### Error: "Invalid access token"

**Solution:**
1. Generate new permanent token in Meta for Developers
2. Update in admin settings
3. Make sure it's a permanent token, not temporary (24h) token

### Error: "Failed to fetch templates"

**Solution:**
1. Verify WABA ID is correct
2. Verify access token has WhatsApp permissions
3. Check Meta for Developers → App → Permissions
4. Ensure WhatsApp Business Management permission is granted

---

## 📞 WhatsApp Template Guidelines

### Template Best Practices

1. **Keep it Short**: 160-300 characters recommended
2. **Clear CTA**: Include clear call-to-action
3. **Professional**: No spammy language
4. **Personalized**: Use parameters ({{1}}, {{2}})
5. **Value-First**: Offer value, not just sales pitch

### Example Templates

**Template 1: Lost Lead Follow-up**
```
Name: lost_lead_followup
Category: Marketing
Language: English

Body:
Hi {{1}}, we noticed you were interested in {{2}}. We'd love to help address any concerns. Reply YES to speak with our team or visit our store!
```

**Template 2: Price Concern**
```
Name: lost_lead_price_concern
Category: Marketing
Language: English

Body:
Hi {{1}}, we understand price is important. We have special offers on {{2}}. Let's find the right option for your budget. Reply YES for details!
```

**Template 3: General Follow-up**
```
Name: lost_lead_general
Category: Marketing
Language: English

Body:
Hello {{1}}, thank you for visiting {{2}}. We're here if you have any questions. Reply anytime - we'd love to help!
```

### Getting Templates Approved

1. **Submit for Review**: Meta reviews all templates
2. **Wait Time**: Usually 24-48 hours
3. **Follow Guidelines**: https://developers.facebook.com/docs/whatsapp/message-templates/guidelines
4. **Common Rejections**:
   - Spelling/grammar errors
   - Misleading content
   - Promotional language without opt-out
   - Missing business context

---

## 🔄 Multi-Tenant Benefits

### Why This Architecture?

1. **Scalability**: Add unlimited shop owners
2. **Independence**: Each shop owns their data
3. **Compliance**: Each shop's own Meta account
4. **Flexibility**: Different templates per shop
5. **Cost Control**: Each shop pays their own Meta fees

### Shop Owner Advantages

- Use your own WhatsApp Business number
- Your brand, your messaging
- Your customer relationships
- Your Meta account, your control
- Your analytics and insights

---

## 📁 File Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/create_whatsapp_credentials.sql` | Database schema |
| `lib/types/whatsapp.ts` | TypeScript types |
| `app/actions/whatsapp.ts` | Server actions |
| `components/WhatsAppButton.tsx` | Reusable button |
| `components/WhatsAppSettings.tsx` | Admin settings UI |
| `components/LeadForm/LostSuccess.tsx` | Lost lead success screen |
| `app/admin/settings/page.tsx` | Admin settings page |

---

## 🎉 You're All Set!

Your multi-tenant WhatsApp integration is complete! Each shop owner can now:
1. Enter their own WhatsApp credentials
2. Fetch their own templates
3. Send messages to lost leads
4. Track their message history

**Next Steps:**
1. Run the database migration
2. Log in as admin
3. Navigate to Settings
4. Set up your WhatsApp credentials
5. Start sending messages to lost leads!

For support or questions, refer to the official WhatsApp Cloud API documentation:
https://developers.facebook.com/docs/whatsapp/cloud-api

---

**Last Updated:** January 2026
**Version:** 2.0.0 (Multi-Tenant)
