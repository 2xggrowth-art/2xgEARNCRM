'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IncentiveBreakdown, SaleCommissionBreakdown, STREAK_BONUSES } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface IncentiveData {
  user_id: string;
  month: string;
  projection: {
    gross_commission: number;
    streak_bonus: number;
    review_bonus: number;
    gross_total: number;
    total_penalty_percentage: number;
    penalty_amount: number;
    net_before_cap: number;
    salary_cap: number | null;
    cap_applied: boolean;
    final_amount: number;
  };
  sales_count: number;
  streak: {
    current_streak: number;
    bonus_tier: string;
    bonus_amount: number;
  };
  reviews: {
    reviews_initiated: number;
    bonus_per_review: number;
    total_bonus: number;
  };
  penalties_count: number;
  breakdown: IncentiveBreakdown;
}

interface TargetProgress {
  target_amount: number;
  achieved_amount: number;
  achievement_percentage: string;
  qualifies_for_incentive: boolean;
  remaining_amount: number;
  sales_count: number;
  days_remaining: number;
  daily_rate_needed: number;
}

interface HistoricalIncentive {
  id: string;
  month: string;
  gross_commission: number;
  streak_bonus: number;
  review_bonus: number;
  penalty_amount: number;
  net_incentive: number;
  final_approved_amount: number | null;
  status: string;
}

export default function MyIncentivesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [currentIncentive, setCurrentIncentive] = useState<IncentiveData | null>(null);
  const [targetProgress, setTargetProgress] = useState<TargetProgress | null>(null);
  const [history, setHistory] = useState<HistoricalIncentive[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'breakdown' | 'history'>('current');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current month incentive projection
      const [incentiveRes, targetRes, historyRes, logoRes] = await Promise.all([
        fetch('/api/earn/incentives/my-current'),
        fetch('/api/earn/targets/progress'),
        fetch('/api/earn/incentives/history?limit=6'),
        fetch('/api/organization/logo'),
      ]);

      const incentiveData = await incentiveRes.json();
      const targetData = await targetRes.json();
      const historyData = await historyRes.json();
      const logoData = await logoRes.json();

      if (incentiveData.success) {
        setCurrentIncentive(incentiveData.data);
      }

      if (targetData.success) {
        setTargetProgress(targetData.data);
      }

      if (historyData.success) {
        setHistory(historyData.data?.incentives || []);
      }

      if (logoData.success && logoData.data?.logo_url) {
        setLogoUrl(logoData.data.logo_url);
      }
    } catch (err) {
      console.error('Error fetching incentive data:', err);
      setError('Failed to load incentive data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      calculating: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Calculating' },
      pending_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending Review' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      paid: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Paid' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
    };
    const badge = badges[status] || badges.calculating;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const handleLogout = () => {
    document.cookie = 'auth_token=; path=/; max-age=0';
    document.cookie = 'user=; path=/; max-age=0';
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading incentives...</div>
      </div>
    );
  }

  const projection = currentIncentive?.projection;
  const streak = currentIncentive?.streak;
  const reviews = currentIncentive?.reviews;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <div className="w-10 h-10 flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt="Organization Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">2XG EARN</h1>
                {user && <p className="text-sm text-gray-500">{user.name}</p>}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Current Month Projection Card */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">
                {currentIncentive?.month ? formatMonth(currentIncentive.month) : 'Current Month'} Projection
              </p>
              <p className="text-4xl font-bold">
                {formatCurrency(projection?.final_amount || 0)}
              </p>
              {projection?.cap_applied && (
                <p className="text-green-200 text-xs mt-1">
                  (Capped at salary limit)
                </p>
              )}
            </div>
            <div className="text-6xl opacity-20">💰</div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-green-400">
            <div>
              <p className="text-green-200 text-xs">Sales</p>
              <p className="font-bold">{currentIncentive?.sales_count || 0}</p>
            </div>
            <div>
              <p className="text-green-200 text-xs">Streak</p>
              <p className="font-bold">{streak?.current_streak || 0} days</p>
            </div>
            <div>
              <p className="text-green-200 text-xs">Penalties</p>
              <p className="font-bold">{currentIncentive?.penalties_count || 0}</p>
            </div>
          </div>
        </div>

        {/* Monthly Target - Static */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Target</h2>
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">₹0</span>
              <span className="font-medium text-gray-900">0%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="h-3 rounded-full bg-blue-500" style={{ width: '0%' }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['current', 'breakdown', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'current' ? 'Summary' : tab === 'breakdown' ? 'Breakdown' : 'History'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'current' && projection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Commission Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Sales Commission</h3>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(projection.gross_commission)}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                From {currentIncentive?.sales_count || 0} win sales this month
              </p>
            </div>

            {/* Streak Bonus Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">🔥</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Streak Bonus</h3>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(projection.streak_bonus)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  Current streak: <span className="font-semibold">{streak?.current_streak || 0} days</span>
                </p>
                {/* Streak milestones */}
                <div className="flex gap-2">
                  {[7, 14, 30].map((days) => (
                    <div
                      key={days}
                      className={`text-xs px-2 py-1 rounded ${
                        (streak?.current_streak || 0) >= days
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {days}d = ₹{STREAK_BONUSES[days as keyof typeof STREAK_BONUSES]}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Bonus Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">⭐</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Review Bonus</h3>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(projection.review_bonus)}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {reviews?.reviews_initiated || 0} reviews × ₹{reviews?.bonus_per_review || 10} each
              </p>
            </div>

            {/* Penalties Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Penalties</h3>
                  <p className="text-2xl font-bold text-red-600">-{formatCurrency(projection.penalty_amount)}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {projection.total_penalty_percentage > 0
                  ? `${projection.total_penalty_percentage}% deduction applied`
                  : 'No penalties this month!'
                }
              </p>
            </div>
          </div>
        )}

        {activeTab === 'breakdown' && currentIncentive?.breakdown && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Sales Commission Breakdown</h2>
            </div>
            {currentIncentive.breakdown.sales.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No win sales this month yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Invoice</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Sale</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Rate</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Commission</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentIncentive.breakdown.sales.map((sale: SaleCommissionBreakdown) => (
                      <tr key={sale.lead_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{sale.customer_name}</td>
                        <td className="px-4 py-3 text-gray-600">{sale.invoice_no}</td>
                        <td className="px-4 py-3 text-gray-600">{sale.category_name}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(sale.sale_price)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {sale.commission_rate}%
                          {sale.multiplier_applied && <span className="text-green-600 ml-1">(×1.5)</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          {formatCurrency(sale.commission_amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {sale.review_qualified ? (
                            <span className="text-green-600">✓</span>
                          ) : sale.review_qualified === false ? (
                            <span className="text-red-500">✗</span>
                          ) : (
                            <span className="text-yellow-500">⏳</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right font-semibold text-gray-700">
                        Total Commission:
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">
                        {formatCurrency(projection?.gross_commission || 0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Penalties Breakdown */}
            {currentIncentive.breakdown.penalties.length > 0 && (
              <>
                <div className="px-6 py-4 border-t border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900">Penalties Applied</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {currentIncentive.breakdown.penalties.map((penalty) => (
                    <div key={penalty.id} className="px-6 py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {penalty.type.replace(/_/g, ' ')}
                        </p>
                        {penalty.description && (
                          <p className="text-sm text-gray-500">{penalty.description}</p>
                        )}
                      </div>
                      <span className="font-semibold text-red-600">-{penalty.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Incentive History</h2>
            </div>
            {history.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No historical incentives yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Month</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Commission</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Bonuses</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Penalties</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Net</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatMonth(item.month)}
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.gross_commission)}</td>
                        <td className="px-4 py-3 text-right text-green-600">
                          +{formatCurrency(item.streak_bonus + item.review_bonus)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          -{formatCurrency(item.penalty_amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(item.final_approved_amount || item.net_incentive)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(item.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
