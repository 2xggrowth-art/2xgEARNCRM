import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { requireRole, apiResponse, getQueryParams } from '@/lib/middleware';

type Period = 'today' | 'week' | 'month';

function getPeriodStart(period: Period): string {
  switch (period) {
    case 'today':
      return "DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'";
    case 'week':
      return "NOW() - INTERVAL '7 days'";
    case 'month':
      return "NOW() - INTERVAL '30 days'";
    default:
      return "DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'";
  }
}

export async function GET(request: NextRequest) {
  const authCheck = requireRole(request, ['manager', 'super_admin']);
  if (!authCheck.authorized) return authCheck.response!;

  const orgId = authCheck.user!.organizationId;
  const params = getQueryParams(request);
  const period = (params.get('period') || 'today') as Period;
  const periodStart = getPeriodStart(period);

  try {
    const [
      walkInsResult,
      salesResult,
      reviewsResult,
      retargetedResult,
      walkInTrendResult,
      salesThisWeekResult,
      salesLastWeekResult,
      topPerformersResult,
    ] = await Promise.all([
      // 1. Walk-ins count
      pool.query(
        `SELECT COUNT(*)::int as count
         FROM offer_leads
         WHERE organization_id = $1
           AND created_at >= ${periodStart}`,
        [orgId]
      ),

      // 2. Sales total + count
      pool.query(
        `SELECT COALESCE(SUM(sale_price), 0)::numeric as total, COUNT(*)::int as count
         FROM leads
         WHERE organization_id = $1
           AND status = 'win'
           AND created_at >= ${periodStart}`,
        [orgId]
      ),

      // 3. Reviews collected vs sent
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE review_submitted = true)::int as submitted,
           COUNT(*) FILTER (WHERE review_link_sent_at IS NOT NULL)::int as sent
         FROM google_reviews
         WHERE organization_id = $1
           AND created_at >= ${periodStart}`,
        [orgId]
      ),

      // 4. Lost leads recovered (had lost lead, then won with same phone)
      pool.query(
        `SELECT COUNT(DISTINCT w.customer_phone)::int as count
         FROM leads w
         WHERE w.organization_id = $1
           AND w.status = 'win'
           AND w.created_at >= ${periodStart}
           AND EXISTS (
             SELECT 1 FROM leads l
             WHERE l.customer_phone = w.customer_phone
               AND l.organization_id = w.organization_id
               AND l.status = 'lost'
               AND l.created_at < w.created_at
           )`,
        [orgId]
      ),

      // 5. 7-day walk-in trend
      pool.query(
        `SELECT
           DATE(created_at AT TIME ZONE 'Asia/Kolkata') as day,
           COUNT(*)::int as count
         FROM offer_leads
         WHERE organization_id = $1
           AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata')
         ORDER BY day`,
        [orgId]
      ),

      // 6. Sales this week
      pool.query(
        `SELECT COALESCE(SUM(sale_price), 0)::numeric as total
         FROM leads
         WHERE organization_id = $1
           AND status = 'win'
           AND created_at >= DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'`,
        [orgId]
      ),

      // 7. Sales last week
      pool.query(
        `SELECT COALESCE(SUM(sale_price), 0)::numeric as total
         FROM leads
         WHERE organization_id = $1
           AND status = 'win'
           AND created_at >= DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata' - INTERVAL '7 days'
           AND created_at < DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'`,
        [orgId]
      ),

      // 8. Top 3 performers by revenue
      pool.query(
        `SELECT u.name, SUM(l.sale_price)::numeric as revenue, COUNT(*)::int as wins
         FROM leads l
         JOIN users u ON l.sales_rep_id = u.id
         WHERE l.organization_id = $1
           AND l.status = 'win'
           AND l.created_at >= ${periodStart}
         GROUP BY u.id, u.name
         ORDER BY revenue DESC
         LIMIT 3`,
        [orgId]
      ),
    ]);

    return apiResponse.success({
      stats: {
        walkIns: walkInsResult.rows[0]?.count || 0,
        salesToday: parseFloat(salesResult.rows[0]?.total) || 0,
        salesCount: salesResult.rows[0]?.count || 0,
        reviewsSubmitted: reviewsResult.rows[0]?.submitted || 0,
        reviewsSent: reviewsResult.rows[0]?.sent || 0,
        retargetedCount: retargetedResult.rows[0]?.count || 0,
      },
      walkInTrend: walkInTrendResult.rows.map((row: { day: string; count: number }) => ({
        day: row.day,
        count: row.count,
      })),
      salesComparison: {
        thisWeek: parseFloat(salesThisWeekResult.rows[0]?.total) || 0,
        lastWeek: parseFloat(salesLastWeekResult.rows[0]?.total) || 0,
      },
      topPerformers: topPerformersResult.rows.map((row: { name: string; revenue: string; wins: number }) => ({
        name: row.name,
        revenue: parseFloat(row.revenue) || 0,
        wins: row.wins,
      })),
    });
  } catch (error) {
    console.error('Owner dashboard stats error:', error);
    return apiResponse.serverError('Failed to fetch dashboard stats');
  }
}
