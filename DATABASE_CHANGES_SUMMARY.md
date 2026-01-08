# Database Changes Summary - 2XG Lead CRM

## Date: January 8, 2026

This document summarizes all database schema changes made during the recent development cycle.

---

## 📁 Consolidated SQL File

**File**: [CONSOLIDATED_SQL_MIGRATION_2026-01-08.sql](./CONSOLIDATED_SQL_MIGRATION_2026-01-08.sql)

This single file contains all the SQL migrations and can be executed on a fresh database instance to replicate the complete schema.

---

## 🔄 Changes Summary

### 1. Google Review QR Code Support (Jan 5)

**Table Modified**: `organizations`

**Changes**:
- Added `google_review_qr_url` column (TEXT)
- Allows organizations to upload custom QR codes for Google Reviews
- Displayed on Win lead success page

**Migration File**: `add-google-review-qr.sql`

---

### 2. Review Status Tracking (Jan 6)

**Table Modified**: `leads`

**Changes**:
- Added `review_status` column with CHECK constraint
- Values: `'pending'`, `'reviewed'`, `'yet_to_review'`
- Automatically set to `'pending'` for Win leads
- Added index for performance: `idx_leads_review_status`

**Purpose**: Track whether customers have left reviews after successful sales

**Migration File**: `add-review-status.sql`

---

### 3. Category Display Order (Jan 6)

**Table Modified**: `categories`

**Changes**:
- Added `display_order` column (INTEGER, default 0)
- Created composite index: `idx_categories_display_order`
- Initialized with alphabetical ordering

**Purpose**: Allow admins to manually sort categories in the UI

**Migration File**: `add-category-display-order.sql`

---

### 4. WhatsApp Integration Tables (Jan 8)

#### 4.1 WhatsApp Credentials Table

**New Table**: `whatsapp_credentials`

**Schema**:
```sql
- id (UUID, PRIMARY KEY)
- organization_id (UUID, FK to organizations)
- whatsapp_access_token (TEXT) - Meta Access Token
- phone_number_id (TEXT) - WhatsApp Phone Number ID
- waba_id (TEXT) - WhatsApp Business Account ID
- phone_number (TEXT) - Display phone number
- business_name (TEXT)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- UNIQUE(organization_id)
```

**Features**:
- Row Level Security (RLS) enabled
- Auto-updating `updated_at` trigger
- Indexes on `organization_id` and `is_active`

**Policies**:
- Users can view their own organization's credentials
- Only admins/owners can manage credentials

#### 4.2 WhatsApp Message Logs Table

**New Table**: `whatsapp_message_logs`

**Schema**:
```sql
- id (UUID, PRIMARY KEY)
- organization_id (UUID, FK)
- lead_id (UUID, FK, nullable)
- user_id (UUID, FK, nullable)
- recipient_phone (TEXT)
- template_name (TEXT)
- message_type (TEXT)
- message_id (TEXT) - WhatsApp message ID
- status (TEXT) - sent, delivered, read, failed
- error_message (TEXT)
- sent_at (TIMESTAMPTZ)
- template_parameters (JSONB)
```

**Features**:
- RLS enabled
- Indexes on `organization_id`, `lead_id`, and `sent_at`
- Stores complete message history for analytics

**Migration File**: `create_whatsapp_credentials.sql`

---

## 🚀 How to Apply These Changes

### Option 1: Use the Consolidated File
```bash
# Execute the consolidated SQL file
psql -h your-database-host -U your-user -d your-database -f CONSOLIDATED_SQL_MIGRATION_2026-01-08.sql
```

### Option 2: Run Individual Migrations
```bash
# Navigate to migrations folder
cd supabase/migrations

# Run each migration in order
psql -f add-google-review-qr.sql
psql -f add-review-status.sql
psql -f add-category-display-order.sql
psql -f create_whatsapp_credentials.sql
```

### Option 3: Using Supabase CLI
```bash
# Apply all pending migrations
supabase db push

# Or apply a specific migration
supabase migration up
```

---

## 📊 Impact Analysis

### Performance Impact
- **Minimal**: All new indexes are optimized for common query patterns
- **Review Status**: Indexed for fast filtering on Win leads
- **Categories**: Composite index for efficient organization-scoped sorting
- **WhatsApp Logs**: Indexes on common lookup fields (org, lead, date)

### Storage Impact
- **Low**: New columns use minimal storage
- **WhatsApp Logs**: Will grow over time; consider implementing log rotation/archival

### Backward Compatibility
- ✅ All migrations use `IF NOT EXISTS` or `ADD COLUMN IF NOT EXISTS`
- ✅ Existing data is preserved
- ✅ Nullable columns where appropriate
- ✅ Default values set for new fields

---

## 🔒 Security Considerations

### Row Level Security (RLS)
All new tables have RLS enabled:
- Users can only access their organization's data
- Admin-only operations properly restricted
- Read/write permissions separated

### Data Protection
- WhatsApp access tokens should be encrypted at rest (recommended)
- Consider adding encryption for sensitive credentials in production
- Message logs contain customer phone numbers - ensure GDPR compliance

---

## 📝 Next Steps

1. ✅ All migrations tested locally
2. ✅ Consolidated SQL file created
3. ⏳ Apply to production Supabase instance
4. ⏳ Verify all functionality in production
5. ⏳ Monitor performance after deployment

---

## 📞 Support

For questions about these migrations:
- Check the inline comments in the SQL files
- Review the migration files in `supabase/migrations/`
- See integration docs in `WHATSAPP_INTEGRATION.md`

---

**Generated**: January 8, 2026
**Last Updated**: January 8, 2026
**Version**: 1.0
