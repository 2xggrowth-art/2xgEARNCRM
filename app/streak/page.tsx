'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MobileLayout } from '@/components/mobile';
import { STREAK_BONUSES } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  bonus_tier: string;
  bonus_amount: number;
  last_action_date: string | null;
  streak_started_at: string | null;
}

interface EarnedMilestone {
  days: number;
  bonus: number;
  earned: boolean;
}

interface StreakBonusConfig {
  7: number;
  14: number;
  30: number;
}

export default function StreakPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [totalEarned, setTotalEarned] = useState(0);
  const [bonusConfig, setBonusConfig] = useState<StreakBonusConfig>({
    7: STREAK_BONUSES[7],
    14: STREAK_BONUSES[14],
    30: STREAK_BONUSES[30],
  });

  useEffect(() => {
    fetchStreakData();
    fetchBonusConfig();
  }, []);

  const fetchBonusConfig = async () => {
    try {
      const response = await fetch('/api/earn/incentive-config');
      const data = await response.json();
      if (data.success && data.data) {
        setBonusConfig({
          7: data.data.streak_bonus_7_days ?? STREAK_BONUSES[7],
          14: data.data.streak_bonus_14_days ?? STREAK_BONUSES[14],
          30: data.data.streak_bonus_30_days ?? STREAK_BONUSES[30],
        });
      }
    } catch {
      // Use defaults on error
    }
  };

  const fetchStreakData = async () => {
    try {
      const response = await fetch('/api/earn/incentives/my-current');
      const data = await response.json();

      if (data.success && data.data?.streak) {
        const streak = data.data.streak;
        setStreakData({
          current_streak: streak.current_streak || 0,
          longest_streak: streak.longest_streak || streak.current_streak || 0,
          bonus_tier: streak.bonus_tier || 'none',
          bonus_amount: streak.bonus_amount || 0,
          last_action_date: streak.last_action_date || null,
          streak_started_at: streak.streak_started_at || null,
        });
        setTotalEarned(streak.bonus_amount || 0);
      }
    } catch (error) {
      console.error('Error fetching streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMilestones = (): EarnedMilestone[] => {
    const currentStreak = streakData?.current_streak || 0;
    return [
      { days: 7, bonus: bonusConfig[7], earned: currentStreak >= 7 },
      { days: 14, bonus: bonusConfig[14], earned: currentStreak >= 14 },
      { days: 30, bonus: bonusConfig[30], earned: currentStreak >= 30 },
    ];
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getNextMilestone = () => {
    const currentStreak = streakData?.current_streak || 0;
    if (currentStreak < 7) return { days: 7, bonus: bonusConfig[7], daysAway: 7 - currentStreak };
    if (currentStreak < 14) return { days: 14, bonus: bonusConfig[14], daysAway: 14 - currentStreak };
    if (currentStreak < 30) return { days: 30, bonus: bonusConfig[30], daysAway: 30 - currentStreak };
    return null;
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-500">Loading streak data...</div>
        </div>
      </MobileLayout>
    );
  }

  const milestones = getMilestones();
  const nextMilestone = getNextMilestone();
  const currentStreak = streakData?.current_streak || 0;

  return (
    <MobileLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-xl">
            ←
          </button>
          <h1 className="text-lg font-bold">Activity Streak</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Main Streak Display */}
        <div className="bg-white rounded-xl p-6 shadow-sm text-center animate-slide-up">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg">
            <span className="animate-fire text-5xl">
              {currentStreak > 0 ? '🔥' : '❄️'}
            </span>
          </div>
          <p className="text-4xl font-bold text-gray-900">{currentStreak} Days</p>
          <p className="text-gray-500">Current Streak</p>

          {streakData?.longest_streak && streakData.longest_streak > currentStreak && (
            <p className="text-sm text-gray-400 mt-2">
              Best: {streakData.longest_streak} days
            </p>
          )}
        </div>

        {/* Next Milestone */}
        {nextMilestone && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Next Milestone</p>
                  <p className="text-sm text-gray-600">
                    {nextMilestone.daysAway} day{nextMilestone.daysAway > 1 ? 's' : ''} to go!
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-yellow-600">{formatCurrency(nextMilestone.bonus)}</p>
                <p className="text-xs text-gray-500">at {nextMilestone.days} days</p>
              </div>
            </div>
          </div>
        )}

        {/* Streak Bonuses */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">Streak Bonuses (Auto)</h2>
          <div className="space-y-2">
            {milestones.map((milestone) => (
              <div
                key={milestone.days}
                className={`flex justify-between items-center p-3 rounded-lg ${
                  milestone.earned ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      milestone.earned
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {milestone.earned ? '✓' : milestone.days}
                  </div>
                  <span className={milestone.earned ? 'text-green-700 font-medium' : 'text-gray-600'}>
                    {milestone.days} Days
                  </span>
                </div>
                <span
                  className={`font-bold ${
                    milestone.earned ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {milestone.earned ? '✓ ' : ''}{formatCurrency(milestone.bonus)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Total earned: {formatCurrency(totalEarned)} (auto-added to incentive)
          </p>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">How Streaks Work</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <span className="text-lg">📝</span>
              <p>Create at least one lead every day to maintain your streak</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🎁</span>
              <p>Reach milestones (7, 14, 30 days) to earn bonus rewards</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">💰</span>
              <p>Bonuses are automatically added to your monthly incentive</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <p>Missing a day resets your streak to 0</p>
            </div>
          </div>
        </div>

        {/* Motivation */}
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 text-white text-center shadow-lg">
          <p className="text-xl mb-2">
            {currentStreak === 0
              ? '🚀 Start your streak today!'
              : currentStreak < 7
              ? '💪 Keep going! 7 days is within reach!'
              : currentStreak < 14
              ? '🔥 Amazing! Push for 14 days!'
              : currentStreak < 30
              ? '⭐ Incredible! 30 days is the ultimate goal!'
              : '🏆 LEGEND! You have reached 30 days!'}
          </p>
          <button
            onClick={() => router.push('/lead/new')}
            className="mt-2 bg-white text-orange-600 px-6 py-2 rounded-full font-bold text-sm"
          >
            Create Lead Now
          </button>
        </div>
      </div>
    </MobileLayout>
  );
}
