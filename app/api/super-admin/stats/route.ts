/**
 * Super Admin: System-wide Statistics
 * GET /api/super-admin/stats - Get system-wide analytics
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { requirePermission, apiResponse } from '@/lib/middleware';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  // Check permission
  const authCheck = requirePermission(request, 'view_system_reports');
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  try {
    // Get total counts
    const { count: totalOrganizations } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    const { count: winLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'win');

    const { count: lostLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'lost');

    // Get total revenue
    const { data: revenueData } = await supabase
      .from('leads')
      .select('sale_price')
      .eq('status', 'win');

    const totalRevenue = revenueData?.reduce(
      (sum, lead) => sum + (parseFloat(lead.sale_price) || 0),
      0
    ) || 0;

    // Get users by role
    const { data: usersByRole } = await supabase
      .from('users')
      .select('role')
      .order('role');

    const roleCounts = usersByRole?.reduce((acc: any, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: newLeadsThisWeek } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    const { count: newUsersThisWeek } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    // Get top organizations by leads
    const { data: orgLeadCounts } = await supabase
      .from('leads')
      .select('organization_id, organizations(name)')
      .order('created_at', { ascending: false });

    const orgStats = orgLeadCounts?.reduce((acc: any, lead: any) => {
      const orgId = lead.organization_id;
      if (!acc[orgId]) {
        acc[orgId] = {
          organizationId: orgId,
          organizationName: lead.organizations?.name || 'Unknown',
          leadCount: 0,
        };
      }
      acc[orgId].leadCount++;
      return acc;
    }, {});

    const topOrganizations = Object.values(orgStats || {})
      .sort((a: any, b: any) => b.leadCount - a.leadCount)
      .slice(0, 5);

    return apiResponse.success({
      overview: {
        totalOrganizations: totalOrganizations || 0,
        totalUsers: totalUsers || 0,
        totalLeads: totalLeads || 0,
        winLeads: winLeads || 0,
        lostLeads: lostLeads || 0,
        totalRevenue,
        conversionRate:
          totalLeads && totalLeads > 0
            ? Math.round(((winLeads || 0) / totalLeads) * 100)
            : 0,
      },
      usersByRole: {
        super_admin: roleCounts.super_admin || 0,
        manager: roleCounts.manager || 0,
        staff: roleCounts.staff || 0,
        sales_rep: roleCounts.sales_rep || 0,
      },
      recentActivity: {
        newLeadsThisWeek: newLeadsThisWeek || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
      },
      topOrganizations,
    });
  } catch (error: any) {
    logger.error('Error fetching system stats:', error);
    return apiResponse.serverError(error.message);
  }
}
