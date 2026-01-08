# Deployment Fix: "Failed to update review status" Error

## Problem

When deployed to Vercel, the application was showing an error: **"Failed to update review status"** even though it worked perfectly in local development.

## Root Cause

The authentication middleware file was named `proxy.ts` instead of `middleware.ts`. While Next.js 16 is introducing a new `proxy.ts` convention, Vercel deployments currently expect the standard `middleware.ts` naming convention.

When the middleware wasn't running on Vercel:
- The `x-organization-id` header was not being set on API requests
- API routes like `/api/leads/update-review-status` returned 401 Unauthorized
- Users saw "Failed to update review status" errors

## Solution Applied

1. **Renamed the file**: `proxy.ts` → `middleware.ts`
2. **Updated function name**: `proxy()` → `middleware()`
3. **Improved response handling**: Changed from `NextResponse.rewrite()` to `NextResponse.next()` for better header propagation

## Files Changed

- `proxy.ts` → `middleware.ts` (renamed and updated)

## How It Works

The middleware now properly:
1. Runs on every request (both locally and on Vercel)
2. Extracts user authentication data from cookies
3. Sets custom headers (`x-organization-id`, `x-user-id`, `x-user-role`)
4. Passes these headers to API routes
5. API routes can now properly validate and scope requests to the correct organization

## Deployment Steps

To deploy this fix to Vercel:

### Option 1: Push to deploy (if auto-deploy is enabled)
```bash
git push origin feature/google-review-qr-and-category-management
```

### Option 2: Merge to main and deploy
```bash
# Switch to main branch
git checkout main

# Merge the fix
git merge feature/google-review-qr-and-category-management

# Push to trigger deployment
git push origin main
```

### Option 3: Manual deployment from Vercel Dashboard
1. Go to your Vercel dashboard
2. Select your project
3. Go to "Deployments" tab
4. Click "Redeploy" on the latest deployment
5. Or trigger a new deployment from the connected branch

## Verification

After deployment, test the fix:

1. **Login** to your application
2. **Create a new lead** and mark it as "Win"
3. On the success page, you should see:
   - A QR code for Google reviews
   - Two buttons: "✓ Reviewed" and "⏳ Yet to Review"
4. **Click either button** - it should work without showing "Failed to update review status"
5. The status should update successfully and show a confirmation message

## Technical Details

### Why it works locally but not on Vercel

- **Local Development**: Next.js dev server is more lenient and may recognize both `proxy.ts` and `middleware.ts`
- **Vercel Production**: Uses optimized build process that expects standard Next.js conventions

### Why middleware.ts instead of proxy.ts

While Next.js 16 introduces `proxy.ts` as a new convention, there are currently known issues with Vercel deployments:
- [Issue #86122](https://github.com/vercel/next.js/issues/86122): proxy.ts doesn't execute in production behind proxies
- [Issue #86434](https://github.com/vercel/next.js/issues/86434): proxy/middleware doesn't work with ESM apps on Vercel

The `middleware.ts` convention is still fully supported and more stable for production deployments.

## Next.js 16 Note

Next.js 16 shows a deprecation warning:
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

However, this is safe to ignore for now. The warning is for future migration, but `middleware.ts` is still the recommended approach for stable Vercel deployments until the proxy.ts bugs are resolved.

## Additional Resources

- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Vercel Deployment Documentation](https://vercel.com/docs/deployments/overview)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
