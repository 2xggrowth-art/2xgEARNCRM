import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

/**
 * Auto-Expire Leads Cron Job
 *
 * This endpoint automatically marks Lost leads with an auto-expire note
 * if they haven't been updated in 30 days past their expected purchase timeline.
 *
 * Should be called by a cron service (e.g., Vercel Cron, GitHub Actions, or external cron)
 *
 * Security: Uses a secret token to prevent unauthorized access
 */

export async function GET(request: NextRequest) {
  try {
    // Security: Check for cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Calculate the cutoff date (30 days ago from now)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    console.log(`[Auto-Expire] Checking for Lost leads older than ${cutoffDate} that haven't converted`);

    // Find all Lost leads that:
    // 1. Status is 'lost'
    // 2. Have not been updated in 30 days
    // 3. Don't already have an auto-expire reason
    // 4. Have a future purchase timeline (indicating they might convert later)

    const { data: expiredLeads, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('id, customer_name, customer_phone, organization_id, created_at, updated_at, status, purchase_timeline, not_today_reason, other_reason')
      .eq('status', 'lost')
      .lt('updated_at', cutoffDate)
      .in('purchase_timeline', ['3_days', '7_days', '30_days']) // Only leads with future timelines
      .not('other_reason', 'like', '%Auto-expired%'); // Don't re-process already expired leads

    if (fetchError) {
      console.error('[Auto-Expire] Error fetching expired leads:', fetchError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch expired leads' },
        { status: 500 }
      );
    }

    if (!expiredLeads || expiredLeads.length === 0) {
      console.log('[Auto-Expire] No leads to expire');
      return NextResponse.json<APIResponse>({
        success: true,
        message: 'No leads to expire',
        data: { expiredCount: 0 },
      });
    }

    console.log(`[Auto-Expire] Found ${expiredLeads.length} leads to mark as auto-expired`);

    // Update all expired leads with auto-expire note
    // We keep them as 'lost' but update the reason to indicate they never followed up
    const { data: updatedLeads, error: updateError } = await supabaseAdmin
      .from('leads')
      .update({
        not_today_reason: 'other',
        other_reason: 'Auto-expired: No follow-up within 30 days of expected purchase timeline',
        updated_at: new Date().toISOString(),
      })
      .in('id', expiredLeads.map(lead => lead.id))
      .select();

    if (updateError) {
      console.error('[Auto-Expire] Error updating expired leads:', updateError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to update expired leads' },
        { status: 500 }
      );
    }

    console.log(`[Auto-Expire] Successfully expired ${updatedLeads?.length || 0} leads`);

    return NextResponse.json<APIResponse>({
      success: true,
      message: `Successfully expired ${updatedLeads?.length || 0} leads`,
      data: {
        expiredCount: updatedLeads?.length || 0,
        leads: updatedLeads,
      },
    });
  } catch (error) {
    console.error('[Auto-Expire] Cron job error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
