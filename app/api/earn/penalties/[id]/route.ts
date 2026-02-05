import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/earn/penalties/[id]
 * Get a specific penalty
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const organizationId = request.headers.get('x-organization-id');

    if (!userId || !organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: penalty, error } = await supabaseAdmin
      .from('penalties')
      .select(`
        *,
        users!penalties_user_id_fkey (name),
        created_by_user:users!penalties_created_by_fkey (name),
        resolved_by_user:users!penalties_resolved_by_fkey (name)
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !penalty) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Penalty not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        ...penalty,
        user_name: penalty.users?.name,
        created_by_name: penalty.created_by_user?.name,
        resolved_by_name: penalty.resolved_by_user?.name,
      },
    });
  } catch (error) {
    console.error('Penalty GET error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/earn/penalties/[id]
 * Dispute or resolve a penalty
 * Body: { action: 'dispute' | 'resolve', dispute_reason?: string, resolution?: 'active' | 'waived', resolution_notes?: string }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;
    const organizationId = request.headers.get('x-organization-id');

    if (!userId || !organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, dispute_reason, resolution, resolution_notes } = body;

    // Get the penalty
    const { data: penalty, error: fetchError } = await supabaseAdmin
      .from('penalties')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !penalty) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Penalty not found' },
        { status: 404 }
      );
    }

    if (action === 'dispute') {
      // Only the affected user can dispute
      if (penalty.user_id !== userId) {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Only the affected user can dispute this penalty' },
          { status: 403 }
        );
      }

      if (penalty.status !== 'active') {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Only active penalties can be disputed' },
          { status: 400 }
        );
      }

      if (!dispute_reason) {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Dispute reason is required' },
          { status: 400 }
        );
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('penalties')
        .update({
          status: 'disputed',
          disputed_at: new Date().toISOString(),
          dispute_reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error disputing penalty:', updateError);
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Failed to dispute penalty' },
          { status: 500 }
        );
      }

      return NextResponse.json<APIResponse>({
        success: true,
        data: updated,
        message: 'Penalty disputed successfully',
      });
    }

    if (action === 'resolve') {
      // Only managers can resolve
      const check = checkPermission(userRole, 'approve_incentives');
      if (!check.authorized) {
        return NextResponse.json<APIResponse>(
          { success: false, error: check.error },
          { status: 403 }
        );
      }

      if (penalty.status !== 'disputed') {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Only disputed penalties can be resolved' },
          { status: 400 }
        );
      }

      if (!resolution || !['active', 'waived'].includes(resolution)) {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Resolution must be "active" or "waived"' },
          { status: 400 }
        );
      }

      const newStatus = resolution === 'waived' ? 'waived' : 'resolved';

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('penalties')
        .update({
          status: newStatus,
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
          resolution_notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error resolving penalty:', updateError);
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Failed to resolve penalty' },
          { status: 500 }
        );
      }

      return NextResponse.json<APIResponse>({
        success: true,
        data: updated,
        message: `Penalty ${resolution === 'waived' ? 'waived' : 'upheld'}`,
      });
    }

    return NextResponse.json<APIResponse>(
      { success: false, error: 'Invalid action. Use "dispute" or "resolve"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Penalty PUT error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/earn/penalties/[id]
 * Delete a penalty (manager+ only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;
    const organizationId = request.headers.get('x-organization-id');

    if (!userId || !organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permission
    const check = checkPermission(userRole, 'approve_incentives');
    if (!check.authorized) {
      return NextResponse.json<APIResponse>(
        { success: false, error: check.error },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('penalties')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error deleting penalty:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to delete penalty' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Penalty deleted',
    });
  } catch (error) {
    console.error('Penalty DELETE error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
