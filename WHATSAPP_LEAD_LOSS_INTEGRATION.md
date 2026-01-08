# WhatsApp Button Integration - Lead Loss Flow

## Overview

When a lead is marked as "Lost" in the CRM, the system now displays a success screen with an integrated WhatsApp button that allows sales representatives to immediately follow up with the customer.

## User Flow

1. **Lead Entry** - Sales rep enters lead information (Steps 1-2)
2. **Lead Marked as Lost** - In Step 1, user selects "Lost" status
3. **Deal Details** - Step 3: Enter deal size and model name
4. **Purchase Timeline** - Step 4: Select when customer might buy + reason for not buying today
5. **Success Screen with WhatsApp** - **NEW!** Step 5 shows:
   - Lead saved confirmation
   - Lead summary (customer name, phone, model, price, reason)
   - **WhatsApp Follow-up Button** - Send template message instantly
   - Navigation options (Add Another Lead / Go to Dashboard)

## Files Modified/Created

### New Component
- **`components/LeadForm/LostSuccess.tsx`** - Success screen with WhatsApp integration

### Modified Files
- **`app/lead/new/page.tsx`** - Updated to show LostSuccess screen (Step 5) after lead creation

## How It Works

### 1. Lead Creation
When a lost lead is submitted, the API response includes the lead ID:

```typescript
const result = await fetch('/api/leads/create', {
  method: 'POST',
  body: JSON.stringify({
    customerName: 'Rajesh Kumar',
    customerPhone: '+919876543210',
    status: 'lost',
    // ... other fields
  })
});

// Response includes lead ID
const { leadId } = await result.json();
```

### 2. Success Screen Display
After successful lead creation, the user sees the `LostSuccess` component:

```tsx
<LostSuccess
  leadId={createdLeadId}
  customerName="Rajesh Kumar"
  customerPhone="+919876543210"
  lostReason="Price concern"
  dealSize={50000}
  modelName="Hero Splendor Plus"
/>
```

### 3. WhatsApp Button Integration
The success screen contains the `WhatsAppButton` component:

```tsx
<WhatsAppButton
  leadId={leadId}
  recipientPhone={customerPhone}
  templateName="lost_lead_followup"
  templateLanguage="en"
  parameters={{
    leadName: customerName,
    reason: lostReason || 'pricing concerns',
  }}
  buttonText="Send Follow-up on WhatsApp"
  className="w-full"
/>
```

## WhatsApp Template Setup

### Required Template
You need to create a template in Meta Business Manager:

**Template Name:** `lost_lead_followup`

**Template Content:**
```
Hi {{1}}, we noticed you didn't purchase because: {{2}}.

Can we help address your concerns? Reply YES to speak with our team.
```

**Variables:**
- `{{1}}` = Customer Name
- `{{2}}` = Reason for not purchasing

**Template Category:** Marketing

### Template Approval
- Submit template in Meta Business Manager
- Wait for approval (24-48 hours)
- Once approved, the WhatsApp button will work

## Benefits

### 1. **Immediate Follow-up**
Sales reps can send a follow-up message immediately after marking a lead as lost, increasing the chance of re-engagement.

### 2. **Personalized Messaging**
The WhatsApp message includes:
- Customer's name
- Specific reason they didn't purchase
- Clear call-to-action

### 3. **Higher Conversion Rates**
Studies show that immediate follow-up increases conversion by 391%. WhatsApp has a 98% open rate vs 20% for email.

### 4. **Better Lead Management**
All WhatsApp messages are logged in the `whatsapp_message_logs` table for:
- Analytics
- Tracking follow-up attempts
- Performance measurement

## Testing the Flow

### Step-by-Step Test

1. **Navigate to Lead Entry**
   - Go to `/lead/new`

2. **Fill Lead Information**
   - Step 1: Enter name and phone, select "Lost"
   - Step 2: Select a product category
   - Step 3: Enter deal size and model name
   - Step 4: Select purchase timeline and reason

3. **View Success Screen**
   - After submitting, you'll see the success screen
   - Lead details are displayed
   - WhatsApp button is visible

4. **Send WhatsApp Message**
   - Click "Send Follow-up on WhatsApp"
   - Button shows loading state
   - On success: Green confirmation appears
   - On error: Red error message displays

5. **Navigate Away**
   - Click "Add Another Lead" to create more leads
   - Click "Go to Dashboard" to return to main screen

## Error Handling

### No WhatsApp Credentials
If WhatsApp credentials are not configured:
```
Error: "WhatsApp credentials not configured. Please contact your administrator."
```

**Solution:** Admin must configure credentials in settings.

### Template Not Found
If the template doesn't exist or isn't approved:
```
Error: "Template not found"
```

**Solution:** Create and get approval for the template in Meta Business Manager.

### Invalid Phone Number
If phone number format is wrong:
```
Error: "Invalid phone number"
```

**Solution:** Ensure phone numbers are in international format (+919876543210).

## UI/UX Features

### Visual Feedback
- **Loading State:** Spinner appears while sending
- **Success State:** Green button with checkmark, confirmation message
- **Error State:** Red button, error message displayed below

### Auto-Reset
Success message automatically resets after 3 seconds, allowing users to send multiple messages if needed.

### Responsive Design
The success screen and WhatsApp button are fully responsive and work on mobile devices.

## Analytics

### Tracking WhatsApp Follow-ups

Query to see lost lead follow-ups:
```sql
SELECT
  l.customer_name,
  l.customer_phone,
  l.lost_reason,
  wml.sent_at,
  wml.status,
  wml.template_name
FROM leads l
LEFT JOIN whatsapp_message_logs wml ON l.id = wml.lead_id
WHERE l.status = 'lost'
  AND wml.sent_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY wml.sent_at DESC;
```

### Success Rate
Track which reasons get the most follow-ups:
```sql
SELECT
  l.not_today_reason,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT wml.id) as whatsapp_sent,
  ROUND(COUNT(DISTINCT wml.id)::numeric / COUNT(DISTINCT l.id) * 100, 2) as followup_rate
FROM leads l
LEFT JOIN whatsapp_message_logs wml ON l.id = wml.lead_id
WHERE l.status = 'lost'
  AND l.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY l.not_today_reason
ORDER BY followup_rate DESC;
```

## Future Enhancements

Potential improvements:
- [ ] Multiple template options (different messages for different reasons)
- [ ] Scheduled follow-up reminders
- [ ] Track response rates from WhatsApp messages
- [ ] A/B test different message templates
- [ ] Bulk WhatsApp sending for old lost leads
- [ ] WhatsApp conversation history in lead detail page

## Screenshots

### Success Screen Layout
```
┌─────────────────────────────────────┐
│         ✓ Lead Saved!               │
│   Lead marked as "Lost" but we      │
│   can still follow up!              │
├─────────────────────────────────────┤
│  Customer: Rajesh Kumar             │
│  Phone: +919876543210               │
│  Model: Hero Splendor Plus          │
│  Price: ₹50,000                     │
│  Reason: Price concern              │
├─────────────────────────────────────┤
│  📢 Follow-up Opportunity           │
│  Send WhatsApp to increase chance   │
│                                     │
│  [📱 Send Follow-up on WhatsApp]   │
│                                     │
│  Pre-approved template message      │
├─────────────────────────────────────┤
│  [Add Another Lead]                 │
│  [Go to Dashboard]                  │
└─────────────────────────────────────┘
```

## Support

For issues or questions:
- Check [WHATSAPP_INTEGRATION.md](WHATSAPP_INTEGRATION.md) for setup
- Verify template approval in Meta Business Manager
- Check credentials in admin settings
- Review logs in `whatsapp_message_logs` table

---

**Last Updated:** January 2026
**Feature Version:** 1.0.0
