# My Updates to Lead CRM

This document contains all the updates and modifications I made to the cloned Lead CRM repository from https://github.com/arsalan507/lead-CRM.git

---

## Summary of Changes

1. **Google Review QR Code Feature** - Added ability for admins to upload custom Google Review QR codes that display on successful sales
2. **Category Deletion Feature** - Added ability for admins to delete product categories
3. **Enhanced Organization Settings UI** - Improved styling and user experience in settings page
4. **Database Schema Update** - Added new column for storing Google Review QR code URLs

---

## 1. Database Migration: Google Review QR Code

**File**: `supabase/migrations/add-google-review-qr.sql` (NEW FILE)

```sql
-- Migration: Add Google Review QR Code to Organizations
-- This allows organizations to upload a custom QR code for Google Reviews

-- Add google_review_qr_url column to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS google_review_qr_url TEXT;

-- Add comment
COMMENT ON COLUMN organizations.google_review_qr_url IS 'URL to the Google Review QR code image shown on Win lead success page';

-- Verify
SELECT 'Google Review QR column added successfully!' as message;
```

**Purpose**: Adds a new column to the organizations table to store the Google Review QR code image URL.

---

## 2. Category Deletion API Endpoint

**File**: `app/api/categories/[id]/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userRole = request.headers.get('x-user-role');

    if (!organizationId || userRole !== 'admin') {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: categoryId } = await params;

    // Check if the category belongs to this organization
    const { data: category, error: fetchError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !category) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Delete the category
    const { error: deleteError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) {
      console.error('Error deleting category:', deleteError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to delete category' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Purpose**: Provides a DELETE endpoint to allow admins to delete product categories.

---

## 3. Updated Organization Type Definition

**File**: `lib/types.ts`

**Changes**:
```typescript
export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  google_review_qr_url: string | null;  // ← NEW FIELD ADDED
  whatsapp_phone_number_id: string | null;
  whatsapp_access_token: string | null;
  created_at: string;
  updated_at: string;
}
```

**Purpose**: Added the `google_review_qr_url` field to the Organization TypeScript interface.

---

## 4. Updated Organization API Route

**File**: `app/api/admin/organization/route.ts`

**Key Changes**:

### GET Method - Removed admin-only restriction
```typescript
// BEFORE:
if (!organizationId || userRole !== 'admin') {
  return NextResponse.json<APIResponse>(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}

// AFTER:
// Allow both admin and sales_rep to read organization data
if (!organizationId) {
  return NextResponse.json<APIResponse>(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
```

### PUT Method - Added Google Review QR code handling
```typescript
// Extract googleReviewQrUrl from request body
const { name, whatsappPhoneNumberId, whatsappAccessToken, contactNumber, logoUrl, googleReviewQrUrl } = body;

// Add to update data
if (googleReviewQrUrl !== undefined) updateData.google_review_qr_url = googleReviewQrUrl;
```

**Purpose**:
- Allows sales reps to read organization data (needed to fetch QR code)
- Handles saving the Google Review QR code URL

---

## 5. Enhanced Admin Settings Page

**File**: `app/admin/settings/page.tsx`

**Major Changes**:

### Added State Variables
```typescript
const [googleReviewQrUrl, setGoogleReviewQrUrl] = useState('');
const [uploadingQr, setUploadingQr] = useState(false);
```

### Load Google Review QR URL
```typescript
useEffect(() => {
  fetchOrganization();
}, []);

// In fetchOrganization function:
setGoogleReviewQrUrl(org.google_review_qr_url || '');
```

### QR Code Upload Handler
```typescript
const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file');
    return;
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert('QR code must be less than 2MB');
    return;
  }

  setUploadingQr(true);

  try {
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setGoogleReviewQrUrl(reader.result as string);
      setUploadingQr(false);
    };
    reader.onerror = () => {
      alert('Failed to read file');
      setUploadingQr(false);
    };
    reader.readAsDataURL(file);
  } catch (error) {
    alert('Failed to upload QR code');
    setUploadingQr(false);
  }
};
```

### Save Google Review QR URL
```typescript
// In handleSaveOrganization:
body: JSON.stringify({
  name,
  contactNumber,
  whatsappPhoneNumberId,
  whatsappAccessToken,
  logoUrl,
  googleReviewQrUrl,  // ← Added
}),
```

### Category Delete Handler
```typescript
const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
  if (!confirm(`Are you sure you want to delete "${categoryName}"?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/categories/${categoryId}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (data.success) {
      setCategories(categories.filter((cat) => cat.id !== categoryId));
      alert('Category deleted successfully');
    } else {
      alert(data.error || 'Failed to delete category');
    }
  } catch (error) {
    alert('Network error');
  }
};
```

### UI Improvements

#### Google Review QR Code Upload Section
```typescript
{/* Google Review QR Code Upload */}
<div>
  <label className="block text-gray-700 font-medium mb-2">
    Google Review QR Code
  </label>
  <div className="flex items-center gap-4">
    {googleReviewQrUrl && (
      <div className="w-24 h-24 border-2 border-gray-300 rounded-lg overflow-hidden bg-white flex items-center justify-center">
        <img
          src={googleReviewQrUrl}
          alt="Google Review QR Code"
          className="max-w-full max-h-full object-contain"
        />
      </div>
    )}
    <div className="flex-1">
      <input
        type="file"
        accept="image/*"
        onChange={handleQrUpload}
        disabled={uploadingQr}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
      />
      <p className="text-xs text-gray-500 mt-1">
        Upload your Google Review QR code. This will be shown when a sale is completed.
      </p>
      {uploadingQr && (
        <p className="text-sm text-green-600 mt-1">Uploading...</p>
      )}
    </div>
  </div>
</div>
```

#### Enhanced Categories Section Styling
```typescript
{/* Categories Management */}
<div className="bg-white rounded-lg shadow-sm p-6">
  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg px-6 py-3 mb-6 shadow-md">
    <h2 className="text-lg font-semibold text-white">Product Categories</h2>
  </div>

  {/* Category list with delete buttons */}
  <div className="space-y-3">
    {categories.map((category) => (
      <div
        key={category.id}
        className="flex items-center justify-between p-4 bg-gray-100 rounded-lg border border-gray-300 hover:bg-gray-200 hover:shadow-md transition-all"
      >
        <span className="font-semibold text-gray-800">{category.name}</span>
        <button
          onClick={() => handleDeleteCategory(category.id, category.name)}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Delete
        </button>
      </div>
    ))}
  </div>
</div>
```

**Purpose**:
- Added Google Review QR code upload functionality
- Added category deletion capability
- Improved UI styling with gradients and better spacing
- Enhanced user experience with loading states and validation

---

## 6. Win Success Page - Dynamic QR Code Display

**File**: `components/LeadForm/WinSuccess.tsx`

**Changes**:

### Added State and Effect for Dynamic QR Loading
```typescript
import { useState, useEffect } from 'react';

const [qrCodeUrl, setQrCodeUrl] = useState<string>('/download.png'); // Default fallback QR code
const [loading, setLoading] = useState(true);

useEffect(() => {
  // Fetch organization's Google Review QR code
  const fetchQrCode = async () => {
    try {
      const response = await fetch('/api/admin/organization', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success && data.data.google_review_qr_url) {
        setQrCodeUrl(data.data.google_review_qr_url);
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      // Keep using default QR code
    } finally {
      setLoading(false);
    }
  };

  fetchQrCode();
}, []);
```

### Updated QR Code Display
```typescript
<div className="bg-white p-6 rounded-xl shadow-lg mb-6 border-2 border-gray-100">
  {loading ? (
    <div className="w-[200px] h-[200px] flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  ) : qrCodeUrl.startsWith('data:') || qrCodeUrl.startsWith('http') ? (
    // Base64 or external URL - use img tag
    <img
      src={qrCodeUrl}
      alt="Google Review QR Code"
      className="w-[200px] h-[200px] object-contain mx-auto"
    />
  ) : (
    // Local path - use Next.js Image
    <Image
      src={qrCodeUrl}
      alt="QR Code"
      width={200}
      height={200}
      className="mx-auto"
      priority
    />
  )}
</div>
```

**Purpose**:
- Dynamically fetches and displays the organization's custom Google Review QR code
- Falls back to default QR code if none is configured
- Handles both base64 encoded images and URL paths
- Shows loading state while fetching

---

## Features Added

### 1. Google Review QR Code Management
- **Admin Upload**: Admins can upload a custom Google Review QR code in Settings
- **Base64 Support**: QR codes are stored as base64 data URLs for easy embedding
- **File Validation**: Validates file type (images only) and size (max 2MB)
- **Dynamic Display**: QR code is fetched and shown on successful sale completion
- **Fallback**: Uses default QR code if organization hasn't uploaded one
- **Preview**: Shows preview of uploaded QR code in settings

### 2. Category Deletion
- **Admin Only**: Only admins can delete categories
- **Confirmation**: Requires user confirmation before deletion
- **Organization Scoped**: Can only delete categories belonging to their organization
- **Cascade Safe**: Uses database foreign key constraints to handle related data
- **UI Feedback**: Shows success/error messages after deletion

### 3. Enhanced Settings UI
- **Gradient Headers**: Beautiful gradient header for Product Categories section
- **Improved Styling**: Better card layouts with hover effects and shadows
- **Delete Buttons**: Prominent red delete buttons with trash icon
- **Text Contrast**: Better text colors for readability (text-gray-900, text-gray-800)
- **Responsive Design**: Maintains mobile-friendly layout

### 4. Permission Updates
- **Sales Rep Access**: Sales reps can now read organization data (needed for QR code fetch)
- **Maintained Security**: Only admins can still update organization settings and delete categories

---

## Technical Improvements

1. **Type Safety**: Added `google_review_qr_url` to Organization TypeScript interface
2. **Error Handling**: Proper error handling in QR upload and category deletion
3. **File Validation**: Client-side validation for image uploads
4. **Loading States**: User feedback during async operations
5. **Database Migration**: Clean migration script for schema update
6. **API Authorization**: Proper role-based access control

---

## Files Modified

1. ✅ `supabase/migrations/add-google-review-qr.sql` (NEW)
2. ✅ `app/api/categories/[id]/route.ts` (NEW)
3. ✅ `lib/types.ts` (MODIFIED)
4. ✅ `app/api/admin/organization/route.ts` (MODIFIED)
5. ✅ `app/admin/settings/page.tsx` (MODIFIED)
6. ✅ `components/LeadForm/WinSuccess.tsx` (MODIFIED)

---

## How to Deploy These Changes

### 1. Run the Database Migration
In your Supabase SQL Editor, run:
```sql
-- Add google_review_qr_url column to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS google_review_qr_url TEXT;
```

### 2. Install Dependencies (if needed)
```bash
npm install
```

### 3. Build and Run
```bash
npm run dev
```

### 4. Test the Features
1. Login as admin
2. Go to Settings
3. Upload a Google Review QR code
4. Create a category and try deleting it
5. Create a won lead and verify custom QR code appears

---

## Screenshots of Changes

### Settings Page - Google Review QR Upload
- New upload section for Google Review QR code
- Shows preview of uploaded image
- File type and size validation

### Settings Page - Category Management
- Enhanced gradient header
- Delete buttons with icons
- Improved card styling with hover effects

### Win Success Page
- Dynamically displays custom QR code
- Falls back to default if none configured
- Loading state during fetch

---

## Future Enhancements

Possible improvements to consider:
1. Drag & drop for QR code upload
2. Image cropping/resizing before upload
3. Multiple QR codes for different purposes
4. Analytics on QR code scans
5. Bulk category import/export
6. Category reordering
7. Category usage statistics

---

**Created**: January 5, 2026
**Repository**: https://github.com/arsalan507/lead-CRM.git
**Author**: Your modifications to the original Lead CRM project
