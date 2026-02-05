'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeadWithDetails } from '@/lib/types';

interface ReportMetrics {
  totalEngagement: number;
  totalSales: number;
  totalReviewed: number;
  totalLost: number;
  nps: number;
  conversionRate: number;
}

export default function ReportsView() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalEngagement: 0,
    totalSales: 0,
    totalReviewed: 0,
    totalLost: 0,
    nps: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchLeadsAndCalculateMetrics();
  }, []);

  const fetchLeadsAndCalculateMetrics = async () => {
    try {
      const response = await fetch('/api/leads/my-leads');
      const data = await response.json();

      if (data.success) {
        const fetchedLeads: LeadWithDetails[] = data.data;
        setLeads(fetchedLeads);

        // Calculate metrics
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Total Engagement: Total count of leads
        const totalEngagement = fetchedLeads.length;

        // Total Sales: Count where status = 'win'
        const totalSales = fetchedLeads.filter((lead) => lead.status === 'win').length;

        // Total Reviewed: Count where status = 'win' AND review_status = 'reviewed'
        const totalReviewed = fetchedLeads.filter(
          (lead) => lead.status === 'win' && lead.review_status === 'reviewed'
        ).length;

        // Total Lost: Count where status = 'lost'
        // Note: The original requirement mentioned "OR (status = 'Open' AND created_at is older than 30 days)"
        // but the database only has 'win' and 'lost' statuses. If you need to track stale leads,
        // consider adding logic here or updating your database schema.
        const totalLost = fetchedLeads.filter((lead) => lead.status === 'lost').length;

        // NPS: (Total Reviewed / Total Sales) * 100
        const nps = totalSales > 0 ? (totalReviewed / totalSales) * 100 : 0;

        // Conversion Rate: (Total Sales / Total Engagement) * 100
        const conversionRate = totalEngagement > 0 ? (totalSales / totalEngagement) * 100 : 0;

        setMetrics({
          totalEngagement,
          totalSales,
          totalReviewed,
          totalLost,
          nps,
          conversionRate,
        });
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
              {user && <p className="text-sm text-gray-500 mt-1">{user.name}</p>}
            </div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* NPS Card */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide opacity-90">
                Net Promoter Score
              </h3>
              <div className="bg-white/20 rounded-full p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold">{metrics.nps.toFixed(1)}%</p>
              <p className="text-sm opacity-75">Review Rate</p>
            </div>
            <p className="text-xs mt-2 opacity-80">
              {metrics.totalReviewed} of {metrics.totalSales} sales reviewed
            </p>
          </div>

          {/* Total Sales Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide opacity-90">
                Total Sales
              </h3>
              <div className="bg-white/20 rounded-full p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold">{metrics.totalSales}</p>
              <p className="text-sm opacity-75">Won Deals</p>
            </div>
            <p className="text-xs mt-2 opacity-80">
              {metrics.totalLost} lost opportunities
            </p>
          </div>

          {/* Conversion Rate Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide opacity-90">
                Conversion Rate
              </h3>
              <div className="bg-white/20 rounded-full p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold">{metrics.conversionRate.toFixed(1)}%</p>
              <p className="text-sm opacity-75">Win Rate</p>
            </div>
            <p className="text-xs mt-2 opacity-80">
              {metrics.totalEngagement} total leads
            </p>
          </div>
        </div>

        {/* Funnel Analysis */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Sales Funnel Analysis</h2>
            <p className="text-blue-100 text-sm mt-1">Track your lead conversion journey</p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Total Engagement */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Total Engagement</p>
                        <p className="text-xs text-gray-500">All leads captured</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-2xl font-bold text-gray-900">{metrics.totalEngagement}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-semibold text-gray-700">100%</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-blue-500 h-3 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </td>
                </tr>

                {/* Total Sales (Won) */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 rounded-full p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Won Deals</p>
                        <p className="text-xs text-gray-500">Successfully closed</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-2xl font-bold text-green-600">{metrics.totalSales}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-semibold text-green-600">
                      {metrics.conversionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${metrics.conversionRate}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>

                {/* Total Reviewed */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 rounded-full p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-purple-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Reviewed</p>
                        <p className="text-xs text-gray-500">Customer feedback received</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-2xl font-bold text-purple-600">{metrics.totalReviewed}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-semibold text-purple-600">
                      {metrics.nps.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${metrics.nps}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>

                {/* Total Lost */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 rounded-full p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Lost Opportunities</p>
                        <p className="text-xs text-gray-500">Did not convert</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-2xl font-bold text-red-600">{metrics.totalLost}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-semibold text-red-600">
                      {metrics.totalEngagement > 0
                        ? ((metrics.totalLost / metrics.totalEngagement) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-red-500 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            metrics.totalEngagement > 0
                              ? (metrics.totalLost / metrics.totalEngagement) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {/* Total Engagement Card */}
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-500 rounded-full p-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Total Engagement</h3>
                </div>
                <span className="text-2xl font-bold text-blue-600">{metrics.totalEngagement}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <p className="text-xs text-gray-600 mt-2">100% - All leads captured</p>
            </div>

            {/* Won Deals Card */}
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-green-500 rounded-full p-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Won Deals</h3>
                </div>
                <span className="text-2xl font-bold text-green-600">{metrics.totalSales}</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${metrics.conversionRate}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {metrics.conversionRate.toFixed(1)}% - Successfully closed
              </p>
            </div>

            {/* Reviewed Card */}
            <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-purple-500 rounded-full p-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Reviewed</h3>
                </div>
                <span className="text-2xl font-bold text-purple-600">{metrics.totalReviewed}</span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${metrics.nps}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {metrics.nps.toFixed(1)}% - Customer feedback received
              </p>
            </div>

            {/* Lost Opportunities Card */}
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-red-500 rounded-full p-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Lost Opportunities</h3>
                </div>
                <span className="text-2xl font-bold text-red-600">{metrics.totalLost}</span>
              </div>
              <div className="w-full bg-red-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${
                      metrics.totalEngagement > 0
                        ? (metrics.totalLost / metrics.totalEngagement) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {metrics.totalEngagement > 0
                  ? ((metrics.totalLost / metrics.totalEngagement) * 100).toFixed(1)
                  : 0}
                % - Did not convert
              </p>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{metrics.totalEngagement}</p>
              <p className="text-xs text-gray-600 mt-1">Total Leads</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{metrics.totalSales}</p>
              <p className="text-xs text-gray-600 mt-1">Won</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{metrics.totalReviewed}</p>
              <p className="text-xs text-gray-600 mt-1">Reviewed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{metrics.totalLost}</p>
              <p className="text-xs text-gray-600 mt-1">Lost</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
