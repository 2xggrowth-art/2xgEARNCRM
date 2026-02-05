# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Development server on localhost:3000
npm run build        # Production build (standalone output for Docker)
npm run start        # Run production server
npm run lint         # Run ESLint
```

No test framework is configured. Database migrations are SQL files in `migrations/`.

## Architecture

**Multi-tenant Lead CRM** built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, and **self-hosted PostgreSQL**.

### CRITICAL: Database Layer

We use a **custom PostgreSQL wrapper** (`lib/db.ts`) that provides a Supabase-compatible API but connects directly to PostgreSQL using the `pg` driver.

**DO NOT:**
- Import `@supabase/supabase-js` anywhere
- Add Supabase SDK to package.json
- Delete or modify `lib/db.ts`, `lib/supabase.ts`, or `lib/env-validation.ts`

**ALWAYS:**
```typescript
import { supabaseAdmin } from '@/lib/supabase';
```

### Authentication & Middleware

Phone + 4-digit PIN login → JWT (7-day expiry) stored in `auth_token` cookie. `middleware.ts` validates JWT on every request and injects headers: `x-user-id`, `x-user-role`, `x-organization-id`. API routes read these headers instead of doing their own auth.

Public routes (no auth): `/login`, `/register`, `/offers/*`, `/api/auth/*`, `/api/offers/*`, `/api/organization/logo/*`.

### Role Hierarchy

Four roles defined in `lib/permissions.ts`:
- `super_admin` (4) → all orgs, all users
- `manager` (3) → org settings, team management
- `staff` (2) → limited admin, lead creation
- `sales_rep` (1) → own leads only

Permission checks: `hasPermission(role, permission)`, `canManageUser(managerRole, targetRole)`.

### Multi-Tenant Isolation

Every database query MUST filter by `organization_id` (from JWT payload). The `supabaseAdmin` client (from `lib/supabase.ts`) is used server-side.

### API Response Pattern

All API routes return `APIResponse<T>` format: `{ success, data?, error?, message? }`. Extract user context from request headers set by middleware, not from cookies or JWT directly.

### Key Modules

- `lib/db.ts` — **PostgreSQL query builder** (Supabase-compatible API)
- `lib/supabase.ts` — Re-exports db.ts as `supabaseAdmin`
- `lib/types.ts` — All TypeScript interfaces (User, Lead, Organization, etc.)
- `lib/permissions.ts` — Role hierarchy, permission matrix, access control helpers
- `lib/auth.ts` — JWT creation/verification, PIN hashing with bcrypt
- `lib/logger.ts` — Production-safe logging
- `lib/env-validation.ts` — Validates DATABASE_URL and JWT_SECRET on startup
- `lib/incentive-calculator.ts` — 2XG EARN incentive calculation logic

### Lead Workflow

Leads have two terminal states: `win` (requires invoiceNo, salePrice) or `lost` (requires dealSize, modelId, purchaseTimeline, notTodayReason, leadRating 1-5). Multi-step form in `components/LeadForm/`.

### 2XG EARN Incentive System

Commission-based incentive tracking with:
- Category-based commission rates
- Monthly targets and achievement tracking
- Streak bonuses (7/14/30 day)
- Penalty deductions
- Team pool distribution
- Manager approval workflow

API routes in `/api/earn/*`.

### QR Code Spin Wheel

Customer scans QR → `/offers?rep=<id>` → enters details → `/offers/spin` → prize selected by admin-configured probabilities.

### WhatsApp Integration

Multi-provider support (`meta`, `whatstool`, `other`) configured per organization. Provider config stored as JSONB in `organizations.whatsapp_config`.

## Environment Variables

Required:
```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key
```

See `.env.example` for full template.

## Deployment

Deployed on **Coolify (OVH)** via Docker. DNS for `leadcrm.2xg.in` points to OVH at `51.195.46.40`. Database is **self-hosted PostgreSQL** in Docker container on same server.

### Protected Files (DO NOT DELETE)

| File | Purpose |
|------|---------|
| `lib/db.ts` | PostgreSQL query builder |
| `lib/supabase.ts` | Re-exports db.ts |
| `lib/env-validation.ts` | Env var validation |
| `Dockerfile` | Production build |
| `postcss.config.mjs` | Tailwind CSS 4 |
| `middleware.ts` | JWT auth |

## Developer Guide

See `DEVELOPER_SETUP.md` for full onboarding instructions.

Before pushing, run:
```bash
./scripts/pre-push-check.sh
```
