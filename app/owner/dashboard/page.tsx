'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts';

interface DashboardStats {
  stats: {
    walkIns: number;
    salesToday: number;
    salesCount: number;
    reviewsSubmitted: number;
    reviewsSent: number;
    retargetedCount: number;
  };
  walkInTrend: Array<{ day: string; count: number }>;
  salesComparison: { thisWeek: number; lastWeek: number };
  topPerformers: Array<{ name: string; revenue: number; wins: number }>;
}

type Period = 'today' | 'week' | 'month';

const formatCurrency = (amount: number) => `\u20B9${amount.toLocaleString('en-IN')}`;

const formatShortCurrency = (amount: number) => {
  if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `\u20B9${(amount / 1000).toFixed(1)}K`;
  return formatCurrency(amount);
};

const periodLabels: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
};

export default function OwnerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    if (!['manager', 'admin', 'super_admin'].includes(parsed.role)) {
      router.push('/login');
      return;
    }
    setUser(parsed);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user, period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/dashboard-stats?period=${period}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setData(json.data);
      }
    } catch (e) {
      console.error('Error fetching owner stats:', e);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return null;

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">📊</div>
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const reviewRate = stats && stats.reviewsSent > 0
    ? Math.round((stats.reviewsSubmitted / stats.reviewsSent) * 100)
    : 0;

  const salesMax = Math.max(data?.salesComparison.thisWeek || 0, data?.salesComparison.lastWeek || 0) || 1;
  const thisWeekPct = ((data?.salesComparison.thisWeek || 0) / salesMax) * 100;
  const lastWeekPct = ((data?.salesComparison.lastWeek || 0) / salesMax) * 100;

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-200 text-xs font-medium">Business Dashboard</p>
            <h1 className="text-lg font-bold">{user.name}</h1>
            <p className="text-amber-100 text-sm">Bharat Cycle Hub</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2 px-4 pt-3 pb-1">
        {(['today', 'week', 'month'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              period === p
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-gray-600 shadow-sm'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`p-4 space-y-4 ${loading ? 'opacity-60' : ''} transition-opacity`}>
        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats?.walkIns || 0}</p>
            <p className="text-xs text-gray-500">Walk-ins</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatShortCurrency(stats?.salesToday || 0)}</p>
            <p className="text-xs text-gray-500">Sales ({stats?.salesCount || 0})</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats?.reviewsSubmitted || 0}</p>
            <p className="text-xs text-gray-500">Google Reviews</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats?.retargetedCount || 0}</p>
            <p className="text-xs text-gray-500">Lost Recovered</p>
          </div>
        </div>

        {/* Walk-in Trend Chart */}
        {data && data.walkInTrend.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-3 text-sm">Walk-ins (Last 7 Days)</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.walkInTrend}>
                <XAxis
                  dataKey="day"
                  tickFormatter={(d) => {
                    const date = new Date(d);
                    return date.toLocaleDateString('en-IN', { weekday: 'short' });
                  }}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={25}
                />
                <Tooltip
                  formatter={(value) => [`${value}`, 'Walk-ins']}
                  labelFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sales Comparison */}
        {data && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-3 text-sm">Sales: This Week vs Last</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">This Week</span>
                  <span className="font-bold text-green-600">{formatCurrency(data.salesComparison.thisWeek)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${thisWeekPct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Last Week</span>
                  <span className="font-bold text-gray-500">{formatCurrency(data.salesComparison.lastWeek)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-gray-400 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${lastWeekPct}%` }}
                  />
                </div>
              </div>
              {data.salesComparison.lastWeek > 0 && (
                <p className="text-xs text-gray-500 text-center">
                  {data.salesComparison.thisWeek >= data.salesComparison.lastWeek
                    ? `+${Math.round(((data.salesComparison.thisWeek - data.salesComparison.lastWeek) / data.salesComparison.lastWeek) * 100)}% vs last week`
                    : `${Math.round(((data.salesComparison.thisWeek - data.salesComparison.lastWeek) / data.salesComparison.lastWeek) * 100)}% vs last week`
                  }
                </p>
              )}
            </div>
          </div>
        )}

        {/* Review Collection Rate */}
        {data && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-2 text-sm">Review Collection Rate</h2>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-yellow-600">{reviewRate}%</span>
              <span className="text-sm text-gray-500 mb-1">
                ({stats?.reviewsSubmitted || 0}/{stats?.reviewsSent || 0} collected)
              </span>
            </div>
            {(stats?.reviewsSent || 0) > 0 && (
              <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(reviewRate, 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Top Performers */}
        {data && data.topPerformers.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-3 text-sm">Top Performers</h2>
            <div className="space-y-2">
              {data.topPerformers.map((rep, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-500 text-white'
                      : i === 1 ? 'bg-gray-400 text-white'
                      : 'bg-orange-400 text-white'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="font-medium text-sm text-gray-800">{rep.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 text-sm">{formatShortCurrency(rep.revenue)}</p>
                    <p className="text-xs text-gray-500">{rep.wins} sale{rep.wins !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no data at all */}
        {data && stats?.walkIns === 0 && stats?.salesCount === 0 && stats?.reviewsSubmitted === 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <p className="text-gray-400 text-sm">
              No activity yet for {periodLabels[period].toLowerCase()}.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg pb-safe">
        <div className="flex justify-around items-center h-16">
          <button className="flex flex-col items-center gap-1 text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-semibold">Dashboard</span>
          </button>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex flex-col items-center gap-1 text-gray-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs">Admin</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 text-gray-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
