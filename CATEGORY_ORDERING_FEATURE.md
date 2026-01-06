# Category Ordering Feature

## Overview
This feature allows Admins to manually define the display order of Product Categories using drag-and-drop functionality. The custom order is saved and applies to both Admin and Sales Rep views.

---

## Features Implemented

### 1. Drag-and-Drop Reordering
- **Admin Only**: Only administrators can reorder categories
- **Intuitive UI**: Drag handle icon (≡) on the left of each category
- **Visual Feedback**: Categories dim slightly while being dragged
- **Auto-Save**: Order is automatically saved to database when dropped

### 2. Custom Sort Order
- Categories now have a `display_order` field (integer)
- Lower numbers appear first
- Alphabetical sorting is used as secondary sort

### 3. Persistent Across Sessions
- Order is saved in the database
- Persists across user sessions and browser refreshes
- Both Admin and Sales Rep see the same order

---

## Database Changes

### Migration File
**Location**: `supabase/migrations/add-category-display-order.sql`

**Changes**:
1. Added `display_order` INTEGER column to `categories` table
2. Created index for performance: `idx_categories_display_order`
3. Initialized existing categories with alphabetical order

**Run this migration**:
```sql
-- Add display_order column to categories table
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN categories.display_order IS 'Custom sort order for category display (lower numbers appear first)';

-- Create index for sorting performance
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(organization_id, display_order);

-- Set initial display_order based on alphabetical order
UPDATE categories
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY name) as row_num
  FROM categories
) as subquery
WHERE categories.id = subquery.id;
```

---

## API Changes

### 1. New Endpoint: `/api/categories/reorder`
**Method**: PUT
**Purpose**: Update category display order
**Access**: Admin only

**Request Body**:
```json
{
  "categoryOrders": [
    { "id": "category-uuid-1", "display_order": 1 },
    { "id": "category-uuid-2", "display_order": 2 },
    { "id": "category-uuid-3", "display_order": 3 }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Category order updated successfully"
}
```

### 2. Updated Endpoint: `/api/categories`
**GET Method Changes**:
- Now sorts by `display_order` (ascending) first
- Then alphabetical by `name` as secondary sort

**POST Method Changes**:
- Automatically assigns next available `display_order` number
- New categories appear at the end of the list

---

## UI Changes

### Admin Settings Page
**Location**: `app/admin/settings/page.tsx`

**New Dependencies**:
```json
{
  "@dnd-kit/core": "^6.x.x",
  "@dnd-kit/sortable": "^8.x.x",
  "@dnd-kit/utilities": "^3.x.x"
}
```

**Components Added**:
1. **SortableCategoryItem**: Individual draggable category row
2. **DndContext**: Drag-and-drop context wrapper
3. **SortableContext**: Sortable list container

**Visual Features**:
- Drag handle icon (hamburger menu) on left side
- Cursor changes to "grab" when hovering over drag handle
- Category dims to 50% opacity while being dragged
- Smooth animations during reordering

---

## How to Use

### For Admins

1. **Navigate to Settings**
   - Go to Admin Dashboard
   - Click "Settings" or navigate to `/admin/settings`

2. **Reorder Categories**
   - Scroll to "Product Categories" section
   - Click and hold the drag handle (≡) icon
   - Drag category up or down to desired position
   - Release to drop in new position
   - Order is automatically saved

3. **Add New Categories**
   - New categories are added to the bottom of the list
   - Can be immediately dragged to desired position

4. **Delete Categories**
   - Delete button still available on the right
   - Deleting a category re-indexes remaining categories

### For Sales Reps

- Sales reps automatically see categories in the admin-defined order
- No changes required from sales reps
- Order applies in lead creation forms

---

## Files Modified

### New Files Created
1. `supabase/migrations/add-category-display-order.sql` - Database migration
2. `app/api/categories/reorder/route.ts` - Reorder API endpoint

### Files Modified
1. `app/admin/settings/page.tsx` - Added drag-and-drop UI
2. `app/api/categories/route.ts` - Updated sorting logic
3. `lib/types.ts` - Added `display_order` to Category interface
4. `package.json` - Added @dnd-kit dependencies

---

## Technical Details

### Drag-and-Drop Implementation

**Library**: [@dnd-kit](https://dndkit.com/)
- Modern, accessible, and performant
- No external dependencies
- Works on touch devices
- Keyboard accessible

**Sensors Used**:
- **PointerSensor**: Mouse and touch support
- **KeyboardSensor**: Keyboard navigation support

**Strategy**:
- **verticalListSortingStrategy**: Optimized for vertical lists

### Error Handling

1. **Network Errors**:
   - If reorder API fails, original order is restored
   - Categories list is refetched from database

2. **Validation**:
   - Admin-only access enforced
   - Organization ID validated
   - Category ownership verified

### Performance Optimizations

1. **Database Index**:
   - Composite index on `(organization_id, display_order)`
   - Speeds up category fetching

2. **Optimistic UI Updates**:
   - UI updates immediately when dragging
   - Reverts on API failure

3. **Debounced Saves**:
   - Only saves when drag completes (not during drag)

---

## Testing

### Test Scenarios

1. **Drag and Drop**:
   - [ ] Drag first category to last position
   - [ ] Drag last category to first position
   - [ ] Drag middle category up
   - [ ] Drag middle category down
   - [ ] Drop category in same position (no change)

2. **Persistence**:
   - [ ] Refresh page - order persists
   - [ ] Logout and login - order persists
   - [ ] Different browser - order persists

3. **Multi-User**:
   - [ ] Admin reorders in one browser
   - [ ] Sales rep sees new order in another browser (after refresh)

4. **Edge Cases**:
   - [ ] Add new category - appears at bottom
   - [ ] Delete category - order maintained
   - [ ] Reorder with only 2 categories
   - [ ] Reorder with 10+ categories

5. **Permissions**:
   - [ ] Sales rep cannot reorder (no drag handle shown)
   - [ ] Admin can reorder
   - [ ] API blocks non-admin requests

### Manual Testing Steps

1. **Setup**:
   ```bash
   # Run database migration
   Run the SQL in Supabase SQL Editor

   # Install dependencies
   npm install

   # Start dev server
   npm run dev
   ```

2. **Test Reordering**:
   - Login as admin
   - Go to Settings
   - Create 4-5 test categories
   - Drag them to different positions
   - Verify order saves

3. **Test Sales Rep View**:
   - Login as sales rep
   - Create new lead
   - Verify categories appear in admin-defined order

---

## Troubleshooting

### Categories not draggable
- **Issue**: Drag handle not working
- **Solution**: Ensure you're logged in as admin, not sales rep

### Order not saving
- **Issue**: Categories revert to original position
- **Solution**:
  - Check browser console for errors
  - Verify database migration was run
  - Check API endpoint `/api/categories/reorder` is accessible

### Categories show in alphabetical order
- **Issue**: Custom order not being respected
- **Solution**:
  - Verify `display_order` column exists in database
  - Check `/api/categories` endpoint sorting logic
  - Ensure migration was run successfully

### New categories appear in random positions
- **Issue**: New categories not added to end
- **Solution**:
  - Check POST method in `/api/categories/route.ts`
  - Ensure `nextOrder` calculation is correct

---

## Future Enhancements

Potential improvements:
1. **Bulk Reordering**: Select and move multiple categories at once
2. **Category Groups**: Group categories into sections
3. **Collapse/Expand**: Collapse long category lists
4. **Search**: Search/filter categories while reordering
5. **Undo/Redo**: Ability to undo recent reorderings
6. **Drag Preview**: Show visual preview while dragging
7. **Touch Improvements**: Better touch device support
8. **Accessibility**: Enhanced screen reader support

---

**Created**: January 6, 2026
**Status**: ✅ Ready for Testing
**Migration Required**: YES - Run `add-category-display-order.sql` in Supabase
