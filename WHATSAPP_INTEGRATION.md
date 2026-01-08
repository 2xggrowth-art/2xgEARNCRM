# WhatsApp Cloud API Integration

This guide explains the complete WhatsApp messaging feature that allows shop owners to send WhatsApp messages to their leads using their own Official WhatsApp Cloud API credentials.

## Overview

The integration consists of:
1. **Supabase Database Schema** - Secure storage of WhatsApp credentials per organization
2. **TypeScript Types** - Type-safe interfaces for WhatsApp API
3. **Server Actions** - Secure server-side logic for sending messages
4. **React UI Components** - Reusable button component with loading/success states

---

## 1. Database Schema

### Tables Created

#### `whatsapp_credentials`
Stores WhatsApp Cloud API credentials for each organization.

```sql
CREATE TABLE whatsapp_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  whatsapp_access_token TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  phone_number TEXT,
  business_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);
```

**Security Features:**
- Row Level Security (RLS) enabled
- Users can only view their own organization's credentials
- Only admins/owners can manage credentials
- Access tokens are stored securely (consider encryption in production)

#### `whatsapp_message_logs`
Logs all WhatsApp messages for analytics and debugging.

```sql
CREATE TABLE whatsapp_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  lead_id UUID REFERENCES leads(id),
  user_id UUID REFERENCES users(id),
  recipient_phone TEXT NOT NULL,
  template_name TEXT,
  message_type TEXT DEFAULT 'template',
  message_id TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  template_parameters JSONB
);
```

**Migration File:** `lead-CRM/supabase/migrations/create_whatsapp_credentials.sql`

---

## 2. TypeScript Types

Location: `lead-CRM/lib/types/whatsapp.ts`

### Key Interfaces

```typescript
// WhatsApp credentials stored in database
interface WhatsAppCredentials {
  id: string;
  organization_id: string;
  whatsapp_access_token: string;
  phone_number_id: string;
  waba_id: string;
  phone_number?: string;
  business_name?: string;
  is_active: boolean;
}

// Parameters for sending a message
interface SendWhatsAppMessageParams {
  leadId: string;
  recipientPhone: string;
  templateName: string;
  templateLanguage?: string;
  parameters?: {
    leadName?: string;
    reason?: string;
    customField1?: string;
    // ... any custom fields
  };
}

// Result of sending a message
interface SendWhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  logId?: string;
}
```

---

## 3. Server Actions

Location: `lead-CRM/app/actions/whatsapp.ts`

### Main Functions

#### `sendWhatsAppMessage(params)`
Sends a WhatsApp template message to a lead.

**Process:**
1. Fetches WhatsApp credentials from Supabase
2. Validates and formats phone number
3. Builds template message with parameters
4. Sends POST request to Meta's Graph API
5. Logs the message attempt to database
6. Returns success/error result

**Example:**
```typescript
const result = await sendWhatsAppMessage({
  leadId: 'uuid-here',
  recipientPhone: '+919876543210',
  templateName: 'lost_lead_followup',
  templateLanguage: 'en',
  parameters: {
    leadName: 'Rajesh Kumar',
    reason: 'Price was too high',
  },
});

if (result.success) {
  console.log('Message ID:', result.messageId);
} else {
  console.error('Error:', result.error);
}
```

#### `isWhatsAppConfigured()`
Checks if WhatsApp credentials are configured for the current organization.

#### `getWhatsAppStatus()`
Returns configuration status and metadata (without exposing tokens).

#### `saveWhatsAppCredentials(data)`
Saves or updates WhatsApp credentials (admin-only).

---

## 4. React UI Components

### WhatsAppButton Component

Location: `lead-CRM/components/WhatsAppButton.tsx`

A reusable, self-contained button component with built-in loading and success states.

**Features:**
- Loading state with spinner
- Success/error visual feedback
- Auto-reset after success
- Error message display
- Customizable styling
- WhatsApp icon included
- TypeScript support
- Callbacks for success/error

**Props:**
```typescript
interface WhatsAppButtonProps {
  leadId: string;              // Required: Lead UUID
  recipientPhone: string;      // Required: Phone with country code
  templateName: string;        // Required: Meta template name
  templateLanguage?: string;   // Optional: Default 'en'
  parameters?: {               // Optional: Template variables
    leadName?: string;
    reason?: string;
    customField1?: string;
    [key: string]: string | undefined;
  };
  buttonText?: string;         // Optional: Default 'Send WhatsApp'
  className?: string;          // Optional: Additional CSS classes
  onSuccess?: (messageId: string) => void;
  onError?: (error: string) => void;
}
```

**Basic Usage:**
```tsx
import WhatsAppButton from '@/components/WhatsAppButton';

export default function LeadDetails({ lead }) {
  return (
    <WhatsAppButton
      leadId={lead.id}
      recipientPhone={lead.phone}
      templateName="hello_world"
    />
  );
}
```

**Advanced Usage:**
```tsx
<WhatsAppButton
  leadId={lead.id}
  recipientPhone={lead.phone}
  templateName="lost_lead_followup"
  templateLanguage="en"
  parameters={{
    leadName: lead.name,
    reason: lead.lost_reason,
  }}
  buttonText="Send Follow-up"
  className="w-full"
  onSuccess={(messageId) => {
    console.log('Sent:', messageId);
    // Update UI, show toast, etc.
  }}
  onError={(error) => {
    console.error('Failed:', error);
    // Show error notification
  }}
/>
```

### WhatsAppMessageExample Component

Location: `lead-CRM/components/WhatsAppMessageExample.tsx`

A comprehensive example component showing various use cases and usage patterns.

---

## 5. Setup Instructions

### Step 1: Get WhatsApp Cloud API Credentials

1. **Create Meta Business Account**
   - Go to [Meta Business Suite](https://business.facebook.com)
   - Create a business account if you don't have one

2. **Set up WhatsApp Business API**
   - Go to [Meta for Developers](https://developers.facebook.com)
   - Create a new app or select existing app
   - Add "WhatsApp" product to your app
   - Navigate to WhatsApp > API Setup

3. **Get Required Credentials**
   - **Access Token**: Generate a permanent access token (Temporary tokens expire in 24 hours)
   - **Phone Number ID**: Found in WhatsApp > API Setup
   - **WhatsApp Business Account ID (WABA ID)**: Found in Settings > Business Settings

### Step 2: Create WhatsApp Message Templates

1. Go to WhatsApp Manager > Message Templates
2. Create templates following Meta's guidelines
3. Wait for template approval (usually 24-48 hours)

**Template Example:**
```
Template Name: lost_lead_followup
Language: English
Category: Marketing

Body:
Hi {{1}}, we noticed you didn't purchase because: {{2}}.
Can we help address your concerns? Reply YES to speak with our team.

Variables:
{{1}} = Lead Name
{{2}} = Reason for not purchasing
```

### Step 3: Run Database Migration

```bash
cd lead-CRM
psql YOUR_DATABASE_URL -f supabase/migrations/create_whatsapp_credentials.sql
```

Or use Supabase CLI:
```bash
supabase db push
```

### Step 4: Configure Credentials in Your App

Create an admin settings page or use the server action directly:

```typescript
import { saveWhatsAppCredentials } from '@/app/actions/whatsapp';

const result = await saveWhatsAppCredentials({
  whatsapp_access_token: 'YOUR_ACCESS_TOKEN',
  phone_number_id: 'YOUR_PHONE_NUMBER_ID',
  waba_id: 'YOUR_WABA_ID',
  phone_number: '+919876543210',
  business_name: 'My Shop',
  is_active: true,
});
```

### Step 5: Use in Your Application

Import and use the WhatsAppButton component in your lead management pages:

```tsx
import WhatsAppButton from '@/components/WhatsAppButton';

export default function LeadCard({ lead }) {
  return (
    <div className="lead-card">
      <h3>{lead.name}</h3>
      <p>{lead.phone}</p>

      <WhatsAppButton
        leadId={lead.id}
        recipientPhone={lead.phone}
        templateName="follow_up_message"
        parameters={{
          leadName: lead.name,
        }}
      />
    </div>
  );
}
```

---

## 6. Security Best Practices

### Access Token Security

**Current Implementation:**
- Access tokens stored in `whatsapp_credentials` table
- RLS policies restrict access to organization members only
- Only admins can view/modify credentials

**Production Recommendations:**
1. **Encrypt Access Tokens**: Use database-level encryption or application-level encryption
2. **Use Environment Variables**: For system-level tokens (not user-specific)
3. **Rotate Tokens**: Regularly rotate access tokens
4. **Audit Logs**: Monitor `whatsapp_message_logs` for suspicious activity

### Server-Side Only

The server action ensures:
- Access tokens never sent to client
- All API calls happen server-side
- User can only send messages for their own organization

---

## 7. Template Parameters Mapping

### How Parameters Work

WhatsApp templates use placeholders like `{{1}}`, `{{2}}`, etc.

**Our Implementation:**
```typescript
parameters: {
  leadName: "Rajesh",      // Maps to {{1}}
  reason: "Too expensive", // Maps to {{2}}
  customField1: "Value3",  // Maps to {{3}}
  customField2: "Value4",  // Maps to {{4}}
}
```

**Meta API Payload:**
```json
{
  "template": {
    "name": "lost_lead_followup",
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Rajesh" },
          { "type": "text", "text": "Too expensive" }
        ]
      }
    ]
  }
}
```

---

## 8. Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "WhatsApp credentials not configured" | No credentials in database | Configure credentials via admin settings |
| "Invalid phone number" | Wrong format | Use international format: +919876543210 |
| "Template not found" | Template name doesn't exist | Check template name in Meta Business Manager |
| "Template not approved" | Template pending approval | Wait for Meta approval (24-48 hours) |
| "Invalid access token" | Token expired or wrong | Generate new permanent token |
| "Parameter count mismatch" | Wrong number of parameters | Match template placeholder count |

### Error Logging

All message attempts (success and failure) are logged to `whatsapp_message_logs`:

```sql
SELECT * FROM whatsapp_message_logs
WHERE status = 'failed'
ORDER BY sent_at DESC;
```

---

## 9. Testing

### Test with Meta's Test Numbers

1. In WhatsApp API Setup, add test phone numbers
2. Send messages to these numbers without approval
3. Test all templates before production

### Test Checklist

- [ ] Credentials save successfully
- [ ] Template message sends to test number
- [ ] Parameters populate correctly
- [ ] Error messages display properly
- [ ] Success state shows after send
- [ ] Message logs saved to database
- [ ] RLS policies work (users can't see other orgs' credentials)
- [ ] Phone number formats handled correctly (+91, without +, with spaces)

---

## 10. Monitoring and Analytics

### View Message Statistics

```sql
-- Messages sent today
SELECT COUNT(*) as total_sent
FROM whatsapp_message_logs
WHERE sent_at >= CURRENT_DATE
  AND status = 'sent';

-- Messages by template
SELECT
  template_name,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status = 'sent') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM whatsapp_message_logs
GROUP BY template_name;

-- Recent errors
SELECT
  recipient_phone,
  template_name,
  error_message,
  sent_at
FROM whatsapp_message_logs
WHERE status = 'failed'
ORDER BY sent_at DESC
LIMIT 10;
```

---

## 11. Cost Management

### WhatsApp Cloud API Pricing

- **Template Messages**: ~$0.005 - $0.10 per message (varies by country)
- **Free Tier**: 1,000 free conversations per month
- **Business-Initiated**: Template messages start conversations
- **24-Hour Window**: Free messages within 24h of customer reply

### Cost Optimization

1. **Use Templates Wisely**: Avoid unnecessary messages
2. **Monitor Logs**: Track message volume
3. **Set Alerts**: Create budget alerts in Meta Business Manager
4. **Batch Processing**: Send messages in batches during off-peak hours

---

## 12. API Reference

### Meta WhatsApp Cloud API Endpoint

```
POST https://graph.facebook.com/v18.0/{phone_number_id}/messages
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {access_token}
```

**Payload:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919876543210",
  "type": "template",
  "template": {
    "name": "template_name",
    "language": {
      "code": "en"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Parameter 1" },
          { "type": "text", "text": "Parameter 2" }
        ]
      }
    ]
  }
}
```

---

## 13. Future Enhancements

Potential improvements:
- [ ] Support for media templates (images, videos, documents)
- [ ] Interactive messages (buttons, lists)
- [ ] Webhook handling for delivery status
- [ ] Bulk messaging
- [ ] Message scheduling
- [ ] Template management UI
- [ ] Analytics dashboard
- [ ] A/B testing for templates

---

## Support and Resources

- **Meta WhatsApp Documentation**: https://developers.facebook.com/docs/whatsapp
- **Template Guidelines**: https://developers.facebook.com/docs/whatsapp/message-templates/guidelines
- **API Reference**: https://developers.facebook.com/docs/whatsapp/cloud-api/reference
- **Business Manager**: https://business.facebook.com

---

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/create_whatsapp_credentials.sql` | Database schema |
| `lib/types/whatsapp.ts` | TypeScript types |
| `app/actions/whatsapp.ts` | Server actions |
| `components/WhatsAppButton.tsx` | Reusable UI component |
| `components/WhatsAppMessageExample.tsx` | Usage examples |

---

**Last Updated:** January 2026
**Version:** 1.0.0
