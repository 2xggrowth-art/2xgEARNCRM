# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Development server on localhost:3000
npm run build        # Production build (standalone output for Docker)
npm run start        # Run production server
npm run lint         # Run ESLint
```

No test framework is configured. Database migrations are SQL files in `migrations/` — run them manually in the Supabase SQL Editor.

## Architecture

**Multi-tenant Lead CRM** built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, and Supabase.

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

Every database query MUST filter by `organization_id` (from JWT payload). The `supabaseAdmin` client (service role, bypasses RLS) is used server-side in `lib/supabase.ts`.

### API Response Pattern

All API routes return `APIResponse<T>` format: `{ success, data?, error?, message? }`. Extract user context from request headers set by middleware, not from cookies or JWT directly.

### Key Modules

- `lib/types.ts` — All TypeScript interfaces (User, Lead, Organization, SpinPrize, etc.)
- `lib/permissions.ts` — Role hierarchy, permission matrix, access control helpers
- `lib/auth.ts` — JWT creation/verification, PIN hashing with bcrypt
- `lib/logger.ts` — Production-safe logging (auto-redacts sensitive fields, `logger.error()` always logs, others dev-only)
- `lib/supabase.ts` — Supabase admin client (service role)

### Lead Workflow

Leads have two terminal states: `win` (requires invoiceNo, salePrice) or `lost` (requires dealSize, modelId, purchaseTimeline, notTodayReason, leadRating 1-5). Multi-step form in `components/LeadForm/` with Step1-4 components.

### QR Code Spin Wheel

Customer scans QR → `/offers?rep=<id>` → enters details → `/offers/spin` → prize selected by admin-configured probabilities. Prizes, WhatsApp notification number, and enable/disable toggles managed in admin settings (`organizations` table columns: `offer_prizes`, `offer_whatsapp_number`, `offer_enabled`). Disabled prizes show on wheel but are excluded from selection with probability redistribution.

### WhatsApp Integration

Multi-provider support (`meta`, `whatstool`, `other`) configured per organization. Provider config stored as JSONB in `organizations.whatsapp_config`. Components in `components/whatsapp-providers/`.

## Environment Variables

Required:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
```

`NEXT_PUBLIC_*` must be available at build time. Validation runs on startup via `lib/env-validation.ts`.

## Deployment

Currently deployed on **Coolify (OVH)** via Docker (multi-stage Dockerfile, Node 20 Alpine). DNS for `leadcrm.2xg.in` points to OVH at `51.195.46.40`. Vercel deployment exists but is inactive. Database is Supabase Cloud (not self-hosted).
