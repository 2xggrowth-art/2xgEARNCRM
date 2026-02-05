'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LeadWithDetails } from '@/lib/types';
import { MobileLayout, StreakBadge } from '@/components/mobile';

export const dynamic = 'force-dynamic';

interface IncentiveData {
  projection: {
    final_amount: number;
    gross_commission: number;
    streak_bonus: number;
    review_bonus: number;
  };
  sales_count: number;
  streak: {
    current_streak: number;
    bonus_amount: number;
  };
  reviews: {
    reviews_initiated: number;
  };
}

interface TargetProgress {
  target_amount: number;
  achieved_amount: number;
  achievement_percentage: string;
  qualifies_for_incentive: boolean;
  days_remaining: number;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [incentive, setIncentive] = useState<IncentiveData | null>(null);
  const [targetProgress, setTargetProgress] = useState<TargetProgress | null>(null);
  const [showSEMModal, setShowSEMModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [semCommitmentAccepted, setSemCommitmentAccepted] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchData();
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [leadsRes, incentiveRes, targetRes, logoRes] = await Promise.all([
        fetch('/api/leads/my-leads'),
        fetch('/api/earn/incentives/my-current'),
        fetch('/api/earn/targets/progress'),
        fetch('/api/organization/logo'),
      ]);

      const [leadsData, incentiveData, targetData, logoData] = await Promise.all([
        leadsRes.json(),
        incentiveRes.json(),
        targetRes.json(),
        logoRes.json(),
      ]);

      if (leadsData.success) {
        setLeads(leadsData.data);
      }
      if (incentiveData.success) {
        setIncentive(incentiveData.data);
      }
      if (targetData.success) {
        setTargetProgress(targetData.data);
      }
      if (logoData.success && logoData.data?.logo_url) {
        setLogoUrl(logoData.data.logo_url);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'auth_token=; path=/; max-age=0';
    document.cookie = 'user=; path=/; max-age=0';
    localStorage.removeItem('user');
    router.push('/login');
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Calculate stats
  const winLeads = leads.filter(l => l.status === 'win');
  const lostLeads = leads.filter(l => l.status === 'lost');
  const conversionRate = leads.length > 0 ? Math.round((winLeads.length / leads.length) * 100) : 0;
  const reviewedCount = winLeads.filter(l => l.review_status === 'reviewed').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const currentStreak = incentive?.streak?.current_streak || 0;
  const streakBonus = incentive?.projection?.streak_bonus || 0;

  return (
    <MobileLayout>
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
                <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            )}
            <div>
              <p className="text-green-200 text-xs">Good morning</p>
              <h1 className="text-lg font-bold">{user?.name || 'Sales Rep'}</h1>
              <p className="text-green-100 text-sm">Feb 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge currentStreak={currentStreak} />
            <button
              onClick={handleLogout}
              className="p-2 bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Auto-Calculated Incentive Card */}
        <button
          onClick={() => router.push('/my-incentives')}
          className="btn-mobile w-full bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg text-left animate-slide-up"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-green-100 text-sm">Current Month Projection</p>
              <p className="text-green-200 text-xs">Auto-calculated from sales</p>
            </div>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
              <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
          <p className="text-4xl font-bold mb-3">
            {formatCurrency(incentive?.projection?.final_amount || 0)}
          </p>
          {targetProgress && (
            <>
              <div className="bg-white/20 rounded-full h-2.5 mb-2">
                <div
                  className="bg-white rounded-full h-2.5 transition-all duration-500"
                  style={{ width: `${Math.min(parseFloat(targetProgress.achievement_percentage), 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span>
                  {formatCurrency(targetProgress.achieved_amount)} of {formatCurrency(targetProgress.target_amount)} ({targetProgress.achievement_percentage}%)
                </span>
                <span>Details →</span>
              </div>
            </>
          )}
        </button>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{winLeads.length}</p>
            <p className="text-xs text-gray-500">Win Sales</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-purple-600">{conversionRate}%</p>
            <p className="text-xs text-gray-500">Conversion</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">{reviewedCount}</p>
            <p className="text-xs text-gray-500">Reviews</p>
          </div>
        </div>

        {/* 6 Action Buttons */}
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>⚡</span> Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/lead/new')}
              className="btn-mobile bg-blue-600 text-white rounded-xl p-4 flex flex-col items-center gap-1 shadow-lg hover:bg-blue-700 transition-colors"
            >
              <span className="text-2xl">📝</span>
              <span className="font-semibold text-sm">1. Create Lead</span>
            </button>
            <button
              onClick={() => router.push('/my-incentives')}
              className="btn-mobile bg-green-600 text-white rounded-xl p-4 flex flex-col items-center gap-1 shadow-lg hover:bg-green-700 transition-colors"
            >
              <span className="text-2xl">💰</span>
              <span className="font-semibold text-sm">2. My Incentive</span>
            </button>
            <button
              onClick={() => setShowSEMModal(true)}
              className="btn-mobile bg-purple-600 text-white rounded-xl p-4 flex flex-col items-center gap-1 shadow-lg hover:bg-purple-700 transition-colors"
            >
              <span className="text-2xl">⭐</span>
              <span className="font-semibold text-sm">3. Apply SEM</span>
            </button>
            <button
              onClick={() => setShowPromotionModal(true)}
              className="btn-mobile bg-orange-600 text-white rounded-xl p-4 flex flex-col items-center gap-1 shadow-lg hover:bg-orange-700 transition-colors"
            >
              <span className="text-2xl">🚀</span>
              <span className="font-semibold text-sm">4. Promotion</span>
            </button>
            <button
              onClick={() => setShowPromotionModal(true)}
              className="btn-mobile bg-indigo-600 text-white rounded-xl p-4 flex flex-col items-center gap-1 shadow-lg hover:bg-indigo-700 transition-colors"
            >
              <span className="text-2xl">👥</span>
              <span className="font-semibold text-sm">5. Referrals</span>
            </button>
            <button
              onClick={() => router.push('/reports')}
              className="btn-mobile bg-gray-700 text-white rounded-xl p-4 flex flex-col items-center gap-1 shadow-lg hover:bg-gray-800 transition-colors"
            >
              <span className="text-2xl">📊</span>
              <span className="font-semibold text-sm">6. Reports</span>
            </button>
          </div>
        </div>

        {/* Streak Card */}
        <button
          onClick={() => router.push('/streak')}
          className="btn-mobile w-full bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white shadow-lg text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="animate-fire text-2xl">🔥</span>
              </div>
              <div>
                <p className="text-orange-100 text-xs">Current Streak</p>
                <p className="text-xl font-bold">{currentStreak} Days</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-orange-100 text-xs">Bonus Earned</p>
              <p className="font-bold">{formatCurrency(streakBonus)}</p>
              {currentStreak < 30 && (
                <p className="text-xs text-orange-200">
                  Next: {currentStreak < 7 ? '₹50 at 7d' : currentStreak < 14 ? '₹100 at 14d' : '₹550 at 30d'}
                </p>
              )}
            </div>
          </div>
        </button>

        {/* My Lost Leads Preview */}
        <button
          onClick={() => router.push('/leads')}
          className="btn-mobile w-full bg-white rounded-xl p-4 shadow-sm text-left"
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <span>📋</span> My Lost Leads
            </h2>
            <span className="text-xs text-blue-600">View All →</span>
          </div>
          <div className="space-y-2">
            {lostLeads.slice(0, 2).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-2 bg-red-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm text-gray-900">{lead.customer_name}</p>
                  <p className="text-xs text-gray-500">
                    {lead.category_name} • {lead.purchase_timeline === 'today' ? 'Today' :
                      lead.purchase_timeline === '3_days' ? '3 Days' :
                      lead.purchase_timeline === '7_days' ? '7 Days' : '30 Days'}
                  </p>
                </div>
                <span className="text-blue-600 font-semibold text-sm">
                  {formatCurrency(lead.deal_size || 0)}
                </span>
              </div>
            ))}
            {lostLeads.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-2">No lost leads yet</p>
            )}
          </div>
        </button>
      </div>

      {/* SEM Modal */}
      {showSEMModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Apply for SEM ⭐</h2>
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4 mb-4 text-white">
              <p className="text-purple-100 text-xs uppercase mb-2">Primary Commitment</p>
              <p className="font-bold text-sm mb-3">
                "I fully accept the system, hierarchy, SOPs, and accountability required to be an SEM."
              </p>
              {!semCommitmentAccepted ? (
                <button
                  onClick={() => setSemCommitmentAccepted(true)}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg"
                >
                  I Accept
                </button>
              ) : (
                <div className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-center">
                  ✓ Accepted
                </div>
              )}
            </div>
            {semCommitmentAccepted && (
              <div className="mb-4 space-y-2">
                <h3 className="font-semibold text-gray-800">Requirements:</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• 96% compliance - no shortcuts</li>
                  <li>• End-to-end support workflow</li>
                  <li>• Lost leads must go through manager</li>
                  <li>• Highest respect to clients</li>
                  <li>• CRM entries mandatory</li>
                </ul>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-4xl mb-2">🚀</p>
                  <p className="font-bold text-gray-900">Coming Soon</p>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                setShowSEMModal(false);
                setSemCommitmentAccepted(false);
              }}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Promotion/Coming Soon Modal */}
      {showPromotionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center animate-slide-up">
            <div className="text-6xl mb-4 animate-bounce-slow">🚀</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
            <p className="text-gray-600 mb-6">We're working on this feature!</p>
            <button
              onClick={() => setShowPromotionModal(false)}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
