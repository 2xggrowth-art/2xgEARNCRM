# Lead CRM - Complete File Structure

Detailed overview of all project files and their purposes.

## 📁 Root Directory

```
lead-crm/
├── 📄 package.json                    # Dependencies and scripts
├── 📄 package-lock.json               # Locked dependency versions
├── 📄 tsconfig.json                   # TypeScript configuration
├── 📄 next.config.ts                  # Next.js configuration
├── 📄 tailwind.config.ts              # Tailwind CSS configuration
├── 📄 postcss.config.mjs              # PostCSS configuration
├── 📄 eslint.config.mjs               # ESLint configuration
├── 📄 .gitignore                      # Git ignore rules
├── 📄 .env.local                      # Environment variables (DO NOT COMMIT)
├── 📄 README.md                       # Main documentation
├── 📄 QUICKSTART.md                   # Quick setup guide
├── 📄 DEPLOYMENT.md                   # Deployment instructions
├── 📄 PROJECT_SUMMARY.md              # Project overview
├── 📄 SETUP_CHECKLIST.md              # Launch checklist
├── 📄 FILE_STRUCTURE.md               # This file
├── 📄 supabase-schema.sql             # Database schema
├── 📁 app/                            # Next.js app directory
├── 📁 components/                     # React components
├── 📁 lib/                            # Utility libraries
├── 📁 public/                         # Static assets
└── 📁 node_modules/                   # Dependencies (auto-generated)
```

## 📱 App Directory (`/app`)

Main application code using Next.js App Router.

```
app/
├── 📄 layout.tsx                      # Root layout (HTML structure)
├── 📄 page.tsx                        # Home page (redirect logic)
├── 📄 globals.css                     # Global styles
├── 🖼️ favicon.ico                     # App icon
│
├── 📁 login/                          # Login page
│   └── 📄 page.tsx                    # Phone OTP login UI
│
├── 📁 dashboard/                      # Sales rep dashboard
│   └── 📄 page.tsx                    # Lead list view
│
├── 📁 lead/                           # Lead management
│   └── 📁 new/                        # New lead form
│       └── 📄 page.tsx                # 4-step form container
│
├── 📁 admin/                          # Admin-only pages
│   ├── 📁 dashboard/                  # Admin dashboard
│   │   └── 📄 page.tsx                # Leads by sales rep view
│   ├── 📁 settings/                   # Organization settings
│   │   └── 📄 page.tsx                # Org config & categories
│   └── 📁 team/                       # Team management
│       └── 📄 page.tsx                # Add/view sales reps
│
└── 📁 api/                            # API routes (backend)
    ├── 📁 auth/                       # Authentication
    │   ├── 📁 request-otp/            # Request OTP endpoint
    │   │   └── 📄 route.ts            # POST /api/auth/request-otp
    │   ├── 📁 verify-otp/             # Verify OTP endpoint
    │   │   └── 📄 route.ts            # POST /api/auth/verify-otp
    │   └── 📁 register/               # Registration endpoint
    │       └── 📄 route.ts            # POST /api/auth/register
    │
    ├── 📁 leads/                      # Lead management
    │   ├── 📁 create/                 # Create lead endpoint
    │   │   └── 📄 route.ts            # POST /api/leads/create
    │   ├── 📁 my-leads/               # Get sales rep leads
    │   │   └── 📄 route.ts            # GET /api/leads/my-leads
    │   └── 📁 update/                 # Update lead endpoint
    │       └── 📄 route.ts            # PUT /api/leads/update
    │
    ├── 📁 categories/                 # Category management
    │   └── 📄 route.ts                # GET/POST /api/categories
    │
    ├── 📁 admin/                      # Admin-only endpoints
    │   ├── 📁 leads/                  # All organization leads
    │   │   └── 📄 route.ts            # GET /api/admin/leads
    │   ├── 📁 team/                   # Team management
    │   │   └── 📄 route.ts            # GET/POST /api/admin/team
    │   └── 📁 organization/           # Org settings
    │       └── 📄 route.ts            # GET/PUT /api/admin/organization
    │
    └── 📁 whatsapp/                   # WhatsApp integration
        └── 📁 send-message/           # Send WhatsApp message
            └── 📄 route.ts            # POST /api/whatsapp/send-message
```

## 🧩 Components Directory (`/components`)

Reusable React components.

```
components/
└── 📁 LeadForm/                       # Lead capture form components
    ├── 📄 Step1.tsx                   # Customer name & phone
    ├── 📄 Step2.tsx                   # Category selection
    ├── 📄 Step3.tsx                   # Deal size & model
    └── 📄 Step4.tsx                   # Timeline & reason
```

## 📚 Lib Directory (`/lib`)

Utility functions and configurations.

```
lib/
├── 📄 supabase.ts                     # Supabase client setup
│                                      # - Client for frontend
│                                      # - Admin client for backend
├── 📄 auth.ts                         # Authentication utilities
│                                      # - Generate JWT token
│                                      # - Verify JWT token
│                                      # - Generate OTP
│                                      # - Validate phone/name
└── 📄 types.ts                        # TypeScript type definitions
                                       # - Database types
                                       # - API response types
                                       # - Form data types
```

## 🔒 Middleware (`middleware.ts`)

Route protection and JWT verification.

```
middleware.ts                          # Middleware for auth
                                       # - Verify JWT tokens
                                       # - Protect routes
                                       # - Add user info to headers
```

## 🗄️ Database (`supabase-schema.sql`)

Complete database schema with security.

```
supabase-schema.sql
├── 📊 Tables:
│   ├── organizations                  # Multi-tenant organizations
│   ├── users                          # Admins & sales reps
│   ├── categories                     # Product categories
│   ├── leads                          # Customer leads
│   ├── otp_verifications              # Phone OTP codes
│   └── whatsapp_logs                  # WhatsApp API logs
│
├── 🔐 Security:
│   ├── Row Level Security (RLS)       # Enabled on all tables
│   ├── RLS Policies                   # Data access rules
│   └── Indexes                        # Performance optimization
│
└── 🛠️ Functions:
    ├── create_default_categories()    # Auto-create categories
    ├── cleanup_expired_otps()         # Remove old OTPs
    └── update_updated_at_column()     # Auto-update timestamps
```

## 📦 Key Files Explained

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | NPM dependencies, scripts |
| `tsconfig.json` | TypeScript compiler options |
| `next.config.ts` | Next.js configuration |
| `tailwind.config.ts` | Tailwind CSS customization |
| `eslint.config.mjs` | Code linting rules |
| `.env.local` | Environment variables (secrets) |
| `.gitignore` | Files to exclude from Git |

### Core Application Files

| File | Purpose | Key Features |
|------|---------|--------------|
| `app/layout.tsx` | Root layout | Global HTML structure |
| `app/page.tsx` | Home page | Auto-redirect logic |
| `middleware.ts` | Auth guard | JWT verification, route protection |
| `lib/supabase.ts` | Database client | Supabase connection |
| `lib/auth.ts` | Auth helpers | JWT, OTP generation |
| `lib/types.ts` | TypeScript types | Type safety |

### Page Components

| File | Route | Purpose |
|------|-------|---------|
| `app/login/page.tsx` | `/login` | Phone OTP login |
| `app/dashboard/page.tsx` | `/dashboard` | Sales rep leads |
| `app/lead/new/page.tsx` | `/lead/new` | Lead capture form |
| `app/admin/dashboard/page.tsx` | `/admin/dashboard` | Admin analytics |
| `app/admin/settings/page.tsx` | `/admin/settings` | Org settings |
| `app/admin/team/page.tsx` | `/admin/team` | Team management |

### API Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/request-otp` | POST | Send OTP to phone |
| `/api/auth/verify-otp` | POST | Verify OTP & login |
| `/api/auth/register` | POST | New user registration |
| `/api/leads/create` | POST | Create new lead |
| `/api/leads/my-leads` | GET | Get sales rep leads |
| `/api/categories` | GET | List categories |
| `/api/categories` | POST | Create category (admin) |
| `/api/admin/leads` | GET | All org leads (admin) |
| `/api/admin/team` | GET/POST | Team management (admin) |
| `/api/admin/organization` | GET/PUT | Org settings (admin) |
| `/api/whatsapp/send-message` | POST | Send WhatsApp message |

## 📝 Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Complete documentation | All users |
| `QUICKSTART.md` | 15-minute setup | New users |
| `DEPLOYMENT.md` | Production deployment | DevOps/Admins |
| `PROJECT_SUMMARY.md` | Technical overview | Developers |
| `SETUP_CHECKLIST.md` | Launch verification | Project managers |
| `FILE_STRUCTURE.md` | This file | Developers |

## 🎨 Styling

### Tailwind CSS Classes Used

- **Colors**: blue-600, green-600, red-600, gray-50 to gray-900
- **Spacing**: p-4, m-4, gap-2, etc.
- **Typography**: text-lg, font-semibold, etc.
- **Layout**: flex, grid, max-w-7xl
- **Responsive**: Mobile-first with sm:, md:, lg: breakpoints

### Global Styles

- `app/globals.css` - Base Tailwind directives and custom styles

## 🔧 Development Files

### Auto-Generated (Don't Edit)

```
├── .next/                             # Next.js build output
├── node_modules/                      # NPM packages
├── .git/                              # Git repository
└── package-lock.json                  # Locked dependencies
```

### Should Be Gitignored

```
.env.local                             # Secrets
.next/                                 # Build output
node_modules/                          # Dependencies
.DS_Store                              # macOS files
*.log                                  # Log files
```

## 📊 File Count Summary

```
Total Files: ~50
├── TypeScript/TSX: ~30
├── SQL: 1
├── Markdown: 6
├── Config: 6
├── CSS: 1
└── Other: 6
```

## 🗺️ Data Flow

```
User Input (Phone)
    ↓
Login Page (app/login/page.tsx)
    ↓
API Route (app/api/auth/request-otp/route.ts)
    ↓
Supabase (otp_verifications table)
    ↓
OTP Verification
    ↓
JWT Token Generation (lib/auth.ts)
    ↓
Cookie Storage
    ↓
Protected Routes (middleware.ts checks)
    ↓
Dashboard (app/dashboard/page.tsx)
```

## 🔐 Security Layers

```
1. Environment Variables (.env.local)
    ├── Supabase credentials
    ├── JWT secret
    └── API keys

2. Middleware (middleware.ts)
    ├── JWT verification
    ├── Route protection
    └── User context

3. Database (Supabase)
    ├── Row Level Security
    ├── RLS Policies
    └── Encrypted connections

4. API Routes
    ├── Input validation
    ├── Rate limiting
    └── Error handling
```

## 📱 Component Hierarchy

```
App (layout.tsx)
├── Login Page
│   └── Login Form
│
├── Sales Rep Dashboard
│   ├── Header
│   ├── Lead List
│   └── Add Lead Button
│
├── Lead Form
│   ├── Step1 (Customer)
│   ├── Step2 (Category)
│   ├── Step3 (Deal)
│   └── Step4 (Timeline)
│
└── Admin Dashboard
    ├── Header
    ├── Navigation
    ├── Sales Rep List
    │   ├── Rep Card
    │   └── Lead Table
    ├── Settings
    └── Team Management
```

## 🚀 Build Output

After running `npm run build`:

```
.next/
├── cache/                             # Build cache
├── server/                            # Server-side code
│   ├── app/                           # Compiled pages
│   └── chunks/                        # Code chunks
├── static/                            # Static assets
│   ├── chunks/                        # JS chunks
│   └── css/                           # Compiled CSS
└── BUILD_ID                           # Build identifier
```

## 📖 How to Navigate

1. **Start Here**: `README.md`
2. **Quick Setup**: `QUICKSTART.md`
3. **Understanding Code**: This file (`FILE_STRUCTURE.md`)
4. **Deploying**: `DEPLOYMENT.md`
5. **Launching**: `SETUP_CHECKLIST.md`

## 💡 Tips for Development

- **New Page**: Add to `app/` directory
- **New API**: Add to `app/api/` directory
- **New Component**: Add to `components/` directory
- **New Type**: Add to `lib/types.ts`
- **New Utility**: Add to `lib/` directory

---

**File Structure Version**: 1.0
**Last Updated**: Build completion
**Total Lines of Code**: ~5,000+

For questions about any file, refer to inline code comments or documentation.
