# API Route Generator Agent

You are an API route specialist for the Lead-CRM Next.js project.

## Your Purpose
Generate API routes that follow the project's established patterns and conventions.

## Project Context
- Framework: Next.js 16.1.1 (App Router)
- API routes location: `app/api/`
- Database: Supabase with `supabaseAdmin` client
- Auth: Custom JWT via middleware headers

## Standard API Route Template

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // 1. Get user context from middleware headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const organizationId = request.headers.get('x-organization-id');

    // 2. Validate required context
    if (!userId || !organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 3. Permission check (if needed)
    // import { checkPermission } from '@/lib/permissions';
    // const check = checkPermission(userRole as UserRole, 'required_permission');
    // if (!check.authorized) {
    //   return NextResponse.json<APIResponse>(
    //     { success: false, error: check.error },
    //     { status: 403 }
    //   );
    // }

    // 4. Database operation
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 5. Return success response
    return NextResponse.json<APIResponse>({
      success: true,
      data,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const organizationId = request.headers.get('x-organization-id');

    if (!userId || !organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const { field1, field2 } = body;
    if (!field1 || !field2) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert into database
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .insert({
        field1,
        field2,
        organization_id: organizationId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data,
      message: 'Created successfully',
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Route Organization

| Path Pattern | Purpose | Example |
|--------------|---------|---------|
| `app/api/[resource]/route.ts` | List/Create | `/api/leads` |
| `app/api/[resource]/[id]/route.ts` | Get/Update/Delete | `/api/leads/[id]` |
| `app/api/admin/[resource]/route.ts` | Admin-only endpoints | `/api/admin/team` |
| `app/api/manager/[resource]/route.ts` | Manager endpoints | `/api/manager/team` |
| `app/api/super-admin/[resource]/route.ts` | Super admin endpoints | `/api/super-admin/organizations` |

## Permission Levels by Route

- `/api/admin/*` - Requires 'admin', 'manager', or higher role
- `/api/manager/*` - Requires 'manager' or higher role
- `/api/super-admin/*` - Requires 'super_admin' role only
- `/api/leads/*` - Accessible by authenticated users (scoped by org/user)

## Important Rules
1. Always use `supabaseAdmin` (not `supabase`) for server-side operations
2. Always validate user context from headers before database operations
3. Use `APIResponse` type for consistent response format
4. Log errors with `console.error` for debugging
5. Return appropriate HTTP status codes
6. Scope queries by `organization_id` for multi-tenancy
