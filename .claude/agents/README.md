# Lead-CRM Custom Agents

This directory contains specialized Claude Code agents for the Lead-CRM project.

## Available Agents

| Agent | File | Purpose |
|-------|------|---------|
| **backend** | `backend.md` | Server-side API and database operations |
| **frontend** | `frontend.md` | Client-side React components and pages |
| ↳ **frontend-mobile** | `frontend-mobile.md` | Mobile-first responsive UI |
| ↳ **frontend-web** | `frontend-web.md` | Desktop/tablet layouts |
| **db-migration** | `db-migration.md` | Create Supabase SQL migrations |
| **api-route** | `api-route.md` | Generate API routes following project patterns |
| **permission-audit** | `permission-audit.md` | Audit role permissions across codebase |
| **test-data** | `test-data.md` | Set up test users and sample data |
| **component-gen** | `component-gen.md` | Generate React components with Tailwind |
| **deploy-check** | `deploy-check.md` | Pre-deployment verification checklist |

## How to Use

When working with Claude Code, you can reference these agents by asking:

```
"Use the backend agent to create an API for user notifications"

"Use the frontend agent to build a new dashboard page"

"Use the frontend-mobile agent to optimize the lead form for phones"

"Use the frontend-web agent to create a data table with filters"

"Use the db-migration agent to create a migration for adding a new status field"

"Use the api-route agent to create an endpoint for fetching user notifications"

"Use the permission-audit agent to check all API routes for proper authorization"

"Use the test-data agent to set up test users for QA testing"

"Use the component-gen agent to create a dashboard stats card"

"Use the deploy-check agent to verify the app is ready for production"
```

## Agent Details

### backend
- API route development
- Database operations with Supabase
- Authentication and authorization
- Business logic implementation

### frontend
- React component development
- Page layouts and navigation
- State management patterns
- API integration

### frontend-mobile (sub-agent)
- Mobile-first responsive design
- Touch-friendly interactions
- Bottom navigation patterns
- PWA considerations

### frontend-web (sub-agent)
- Desktop/tablet layouts
- Sidebar navigation
- Data tables and dashboards
- Keyboard shortcuts

### db-migration
- Creates idempotent SQL migrations
- Follows Supabase best practices
- Includes RLS policies
- Outputs to `migrations/` directory

### api-route
- Generates Next.js API routes
- Includes proper error handling
- Follows permission patterns
- Uses supabaseAdmin for server operations

### permission-audit
- Checks API routes for auth
- Validates role-based access
- Identifies security vulnerabilities
- Provides fix recommendations

### test-data
- Creates test users with all roles
- Generates sample leads
- Provides SQL and API methods
- Includes cleanup scripts

### component-gen
- Creates React components
- Uses Tailwind CSS styling
- Includes TypeScript types
- Follows project patterns

### deploy-check
- Validates build process
- Checks environment variables
- Verifies database migrations
- Provides troubleshooting guides

## Adding New Agents

To add a new agent:

1. Create a new `.md` file in this directory
2. Include:
   - Purpose section
   - Project context
   - Templates/patterns
   - Important rules
   - Output format expectations
3. Update this README
4. Reference in CLAUDE.md if frequently used
