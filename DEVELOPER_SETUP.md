# Developer Setup Guide

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/2xggrowth-art/2xgEARNCRM.git
cd 2xgEARNCRM

# 2. Install dependencies
npm install

# 3. Set up environment (see below)
cp .env.example .env.local

# 4. Start dev server
npm run dev
```

## Environment Setup

Create `.env.local` with:

```env
# Database (PostgreSQL) - REQUIRED
DATABASE_URL=postgresql://lead_crm_user:PASSWORD@localhost:5432/lead_crm

# JWT Secret - REQUIRED
JWT_SECRET=your-secret-key-here

# NOTE: We do NOT use Supabase SDK anymore
# The old SUPABASE_* variables are deprecated
```

### Connecting to Production Database (for testing)

The production database runs on OVH/Coolify. To connect locally:

```bash
# SSH tunnel (ask admin for SSH access)
ssh -L 5432:localhost:5432 ubuntu@51.195.46.40

# Then use this DATABASE_URL in .env.local:
DATABASE_URL=postgresql://lead_crm_user:LcRm2026_Pg_S3cure!@localhost:5432/lead_crm
```

### Local PostgreSQL (recommended for development)

```bash
# Run PostgreSQL in Docker
docker run -d \
  --name lead-crm-postgres-dev \
  -e POSTGRES_USER=lead_crm_user \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=lead_crm \
  -p 5433:5432 \
  postgres:16-alpine

# Use this DATABASE_URL:
DATABASE_URL=postgresql://lead_crm_user:devpassword@localhost:5433/lead_crm

# Run migrations (in order)
psql $DATABASE_URL < migrations/00-initial-schema.sql
psql $DATABASE_URL < migrations/phase-2.1-role-hierarchy.sql
# ... run other migrations
```

---

## CRITICAL: Architecture Rules

### 1. Database Layer - DO NOT CHANGE

We use a **custom PostgreSQL wrapper** (`lib/db.ts`), NOT the Supabase SDK.

```typescript
// CORRECT - Use our wrapper
import { supabaseAdmin } from '@/lib/supabase';

const { data, error } = await supabaseAdmin
  .from('leads')
  .select('*')
  .eq('organization_id', orgId);
```

```typescript
// WRONG - Never import Supabase SDK directly
import { createClient } from '@supabase/supabase-js';  // ❌ DON'T DO THIS
```

**Why?** The app runs on self-hosted PostgreSQL (not Supabase Cloud). The wrapper in `lib/db.ts` provides a Supabase-compatible API but uses `pg` (node-postgres) under the hood.

### 2. Protected Files - DO NOT DELETE OR REVERT

These files are critical infrastructure:

| File | Purpose |
|------|---------|
| `lib/db.ts` | PostgreSQL query builder (Supabase-compatible API) |
| `lib/supabase.ts` | Re-exports db.ts as supabaseAdmin |
| `lib/env-validation.ts` | Validates required env vars on startup |
| `Dockerfile` | Production Docker build |
| `postcss.config.mjs` | Tailwind CSS 4 config |
| `middleware.ts` | JWT auth, injects user headers |

### 3. Import Pattern for API Routes

Every API route should use:

```typescript
import { supabaseAdmin } from '@/lib/supabase';
```

Never use:
- `import { createClient } from '@supabase/supabase-js'`
- `import { supabase } from '...'` (always use `supabaseAdmin`)

### 4. Query Builder API

The wrapper supports:

```typescript
// Select with relations
.from('leads')
.select('*, categories(name), users!sales_rep_id(name)')
.eq('organization_id', orgId)
.order('created_at', { ascending: false })

// Insert
.from('leads')
.insert({ ... })
.select()
.single()

// Update
.from('leads')
.update({ status: 'win' })
.eq('id', leadId)

// Upsert (insert or update on conflict)
.from('monthly_targets')
.upsert(data, { onConflict: 'user_id,month' })

// Delete
.from('leads')
.delete()
.eq('id', leadId)
```

### 5. File Paths - No Hardcoded Paths

Never use absolute Windows/Mac paths in config files:

```typescript
// WRONG
const config = { path: 'C:\\Users\\dev\\project' };

// CORRECT
const config = { path: process.cwd() };
```

---

## Git Workflow

### Before Starting Work

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### Before Pushing

```bash
# 1. Make sure build passes
npm run build

# 2. Check you haven't modified critical files
git diff --name-only origin/main | grep -E "(lib/db.ts|lib/supabase.ts|Dockerfile)"
# If these show up, verify your changes are intentional

# 3. Push your branch
git push origin feature/your-feature-name
```

### Pull Request Checklist

- [ ] `npm run build` passes
- [ ] No imports from `@supabase/supabase-js`
- [ ] All database calls use `supabaseAdmin` from `@/lib/supabase`
- [ ] No hardcoded file paths
- [ ] Did not delete/revert: `lib/db.ts`, `Dockerfile`, `lib/env-validation.ts`

---

## Common Mistakes to Avoid

### 1. Installing Supabase SDK

```bash
# DON'T DO THIS
npm install @supabase/supabase-js  # ❌

# We already have everything we need
npm install  # ✓ Just use existing dependencies
```

### 2. Changing Database Connection

The `DATABASE_URL` format is:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Never add Supabase URLs to `.env.local`.

### 3. Reverting package.json

Our `package.json` uses:
- `"pg": "^8.18.0"` - PostgreSQL driver
- No `@supabase/supabase-js`

If your IDE suggests adding Supabase, decline.

---

## Deployment

Deployment is automatic via Coolify:

1. Push to `main` branch
2. Coolify detects the push
3. Builds Docker image using `Dockerfile`
4. Deploys to `leadcrm.2xg.in`

**Never push directly to main** - always use feature branches and PRs.

---

## Need Help?

- Check `CLAUDE.md` for architecture overview
- Check existing API routes for patterns
- Ask before modifying any file in the "Protected Files" list
