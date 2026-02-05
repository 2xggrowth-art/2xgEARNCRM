# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run dev      # Start development server (Next.js 16 with Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Environment Setup

Required environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
JWT_SECRET=<secret-for-jwt-signing>
SMS_PROVIDER=console  # or 'twilio'
```

Generate PIN hash for manual user creation:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('1234', 10).then(console.log);"
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 16.1.1 (App Router), React 19, Tailwind CSS v3
- **Backend**: Next.js API Routes (in `app/api/`)
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Custom JWT authentication with 4-digit PIN (NOT Supabase Auth)

### Role Hierarchy (4 levels)

| Role | Level | Dashboard | Capabilities |
|------|-------|-----------|--------------|
| `super_admin` | 4 | `/super-admin/dashboard` | System-wide: create orgs, manage all users |
| `manager` | 3 | `/manager/dashboard` | Org-level: manage team, view team leads |
| `staff` | 2 | `/staff/dashboard` | View assigned leads, create leads |
| `sales_rep` | 1 | `/dashboard` | Create and view own leads only |

### Authentication Flow

1. User submits phone + PIN to `/api/auth/login`
2. API verifies PIN hash with bcrypt, generates JWT
3. JWT stored in `auth_token` cookie, user data in `user` cookie
4. Middleware (`middleware.ts`) validates cookies on protected routes
5. User context passed to API routes via headers: `x-user-id`, `x-user-role`, `x-organization-id`

### Key Directories

```
app/
├── api/                    # API routes (backend)
│   ├── auth/               # Login, register, OTP endpoints
│   ├── admin/              # Admin-only endpoints (leads, team, org)
│   ├── manager/            # Manager team management
│   ├── super-admin/        # Super admin org/stats endpoints
│   └── leads/              # Lead CRUD operations
├── dashboard/              # Sales rep dashboard
├── admin/dashboard/        # Admin dashboard
├── manager/dashboard/      # Manager dashboard
└── super-admin/dashboard/  # Super admin dashboard

lib/
├── supabase.ts             # Supabase clients (supabase, supabaseAdmin)
├── auth.ts                 # JWT, PIN hashing, validation helpers
├── permissions.ts          # Role permissions and hierarchy helpers
├── types.ts                # TypeScript type definitions
└── middleware.ts           # Auth middleware helpers

migrations/                 # SQL migration files for Supabase
```

### Lead System

Two lead types with different form flows:

**Win Lead (3 steps)**: Customer info → Category → Invoice/Sale price → QR code success screen
**Lost Lead (4 steps)**: Customer info → Category → Deal size/Model → Timeline/Reason

Key fields:
- Win: `invoice_no` (unique), `sale_price`, `review_status`
- Lost: `deal_size`, `model_id`, `purchase_timeline`, `not_today_reason`, `lead_rating`

### Database Constraints

The `users.role` column has a CHECK constraint. When changing roles:
```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
CHECK (role IN ('super_admin', 'manager', 'staff', 'sales_rep', 'admin'));
```

The `users.organization_id` must be nullable for super_admin users (they don't belong to any org).

## Critical Patterns

### API Route Pattern
```typescript
// app/api/example/route.ts
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get user context from middleware headers
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  const organizationId = request.headers.get('x-organization-id');

  // Always use supabaseAdmin for server-side operations (bypasses RLS)
  const { data, error } = await supabaseAdmin
    .from('table')
    .select('*');

  return NextResponse.json({ success: true, data });
}
```

### Permission Check Pattern
```typescript
import { hasPermission, checkPermission } from '@/lib/permissions';
import { UserRole } from '@/lib/types';

// In API route:
const userRole = request.headers.get('x-user-role') as UserRole;
const check = checkPermission(userRole, 'manage_team');
if (!check.authorized) {
  return NextResponse.json({ success: false, error: check.error }, { status: 403 });
}
```

### Public Routes (no auth required)
Defined in `middleware.ts`:
- `/login`, `/customer`
- `/api/auth/*`, `/api/customers/*`, `/api/organization/logo`

## Common Issues

### "Invalid role" database error
The database constraint doesn't include the role. Run the SQL above to update the constraint.

### "supabaseUrl is required" error
Environment variables not loaded. Ensure `.env.local` exists and restart dev server.

### Login fails after user creation
PIN hash may be wrong. Regenerate with bcrypt command and update user's `pin_hash` column.

### Manager can't see team members
Verify team members have `manager_id` set to the manager's user ID.

## Database Migrations

Run migrations in Supabase SQL Editor in order:
1. `migrations/00-initial-schema.sql` - Base tables and RLS
2. `migrations/phase-2.1-role-hierarchy.sql` - Role hierarchy system
3. `migrations/add-incentive-fields.sql` - Incentive tracking

## Test Users

| Role | Phone | PIN | Notes |
|------|-------|-----|-------|
| Super Admin | 9999999999 | 1234 | Create manually in Supabase |
| Manager | 8888888888 | 5678 | Created via super admin |
| Sales Rep | 7777777777 | 1111 | Created via manager |

## Custom Agents

Specialized agents are available in `.claude/agents/`:

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `backend` | Server-side API & database | API routes, business logic |
| `frontend` | Client-side React & pages | UI components, pages |
| ↳ `frontend-mobile` | Mobile-first UI | Phone-optimized interfaces |
| ↳ `frontend-web` | Desktop/tablet UI | Dashboards, data tables |
| `db-migration` | Create SQL migrations | Adding tables, columns, constraints |
| `api-route` | Generate API routes | Creating new endpoints |
| `permission-audit` | Audit permissions | Security review |
| `test-data` | Set up test data | QA testing |
| `component-gen` | Generate React components | UI development |
| `deploy-check` | Pre-deploy verification | Before production deployment |

See `.claude/agents/README.md` for detailed usage.
