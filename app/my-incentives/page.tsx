'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IncentiveBreakdown } from '@/lib/types';

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
  const [, setTargetProgress] = useState<TargetProgress | null>(null);
  const [, setHistory] = useState<HistoricalIncentive[]>([]);
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

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
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

  const streak = currentIncentive?.streak;

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
                {currentIncentive?.month ? formatMonth(currentIncentive.month) : 'Current Month'} Incentive
              </p>
              <p className="text-2xl font-bold">Coming Soon</p>
              <p className="text-green-200 text-xs mt-1">
                Incentive program is being finalized
              </p>
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
              <p className="font-bold">--</p>
            </div>
          </div>
        </div>

        {/* Monthly Target - Placeholder */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Target</h2>
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Target details coming soon</span>
              <span className="font-medium text-gray-400">--%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="h-3 rounded-full bg-gray-300" style={{ width: '0%' }} />
            </div>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Incentive Details Coming Soon</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            We are finalizing the incentive structure. Commission rates, streak bonuses, and detailed breakdowns will appear here once the program is live.
          </p>
        </div>
      </div>
    </div>
  );
}
