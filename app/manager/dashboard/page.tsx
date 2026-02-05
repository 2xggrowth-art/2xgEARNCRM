'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TeamMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  created_at: string;
  last_login: string | null;
  stats: {
    totalLeads: number;
    winCount: number;
    revenue: number;
    conversionRate: number;
  };
  incentive?: {
    projected: number;
    rank: number;
    poolShare: number;
  };
}

interface PoolConfig {
  totalPool: number;
  managerShare: number;
  teamPoolPercentages: number[];
}

export default function ManagerDashboard() {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [poolConfig, setPoolConfig] = useState<PoolConfig>({
    totalPool: 20000,
    managerShare: 20,
    teamPoolPercentages: [20, 12, 8, 6, 4],
  });

  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    phone: '',
    role: 'sales_rep' as 'staff' | 'sales_rep',
    pin: '',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.role !== 'manager') {
      router.push('/login');
      return;
    }

    fetchTeam();
  }, [router]);

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/manager/team', {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        // Sort by revenue for ranking
        const sortedMembers = (data.data || []).sort(
          (a: TeamMember, b: TeamMember) => b.stats.revenue - a.stats.revenue
        );

        // Add rank and pool share
        const membersWithRank = sortedMembers.map((member: TeamMember, index: number) => ({
          ...member,
          incentive: {
            projected: Math.round(member.stats.revenue * 0.015) + (member.stats.winCount * 100),
            rank: index + 1,
            poolShare: poolConfig.teamPoolPercentages[index] || 2,
          },
        }));

        setTeamMembers(membersWithRank);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching team:', error);
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/manager/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newMemberForm),
      });

      const data = await res.json();

      if (data.success) {
        alert('Team member added successfully!');
        setShowAddMember(false);
        setNewMemberForm({
          name: '',
          phone: '',
          role: 'sales_rep',
          pin: '',
        });
        fetchTeam();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      alert('Failed to add team member');
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

  const formatShortCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Calculate team stats
  const teamStats = teamMembers.reduce(
    (acc, member) => ({
      totalLeads: acc.totalLeads + member.stats.totalLeads,
      totalWins: acc.totalWins + member.stats.winCount,
      totalRevenue: acc.totalRevenue + member.stats.revenue,
    }),
    { totalLeads: 0, totalWins: 0, totalRevenue: 0 }
  );

  const overallConversion = teamStats.totalLeads > 0
    ? Math.round((teamStats.totalWins / teamStats.totalLeads) * 100)
    : 0;

  const managerPoolAmount = Math.round(poolConfig.totalPool * (poolConfig.managerShare / 100));

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-200 text-xs">Manager Dashboard</p>
            <h1 className="text-lg font-bold">{user?.name || 'Manager'} 👔</h1>
            <p className="text-purple-100 text-sm">Feb 2026</p>
          </div>
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

      <div className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{teamMembers.length}</p>
            <p className="text-xs text-gray-500">Team Members</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-green-600">{teamStats.totalLeads}</p>
            <p className="text-xs text-gray-500">Total Leads</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">{overallConversion}%</p>
            <p className="text-xs text-gray-500">Avg Conversion</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-purple-600">{formatShortCurrency(teamStats.totalRevenue)}</p>
            <p className="text-xs text-gray-500">Total Revenue</p>
          </div>
        </div>

        {/* Manager Pool Share */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white shadow-lg">
          <p className="text-purple-100 text-sm mb-1">Your Pool Share (Auto)</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold">{formatCurrency(managerPoolAmount)}</p>
              <p className="text-purple-200 text-xs">
                {poolConfig.managerShare}% of {formatCurrency(poolConfig.totalPool)} pool
              </p>
            </div>
            <span className="bg-white/20 px-2 py-1 rounded-full text-xs">Fixed 20%</span>
          </div>
        </div>

        {/* Team Pool Distribution */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <span>🏆</span> Team Pool
            </h2>
            <span className="text-xs text-gray-500">Auto by rank</span>
          </div>
          <div className="space-y-2">
            {teamMembers.slice(0, 5).map((member, index) => {
              const bgColors = ['bg-yellow-50', 'bg-gray-50', 'bg-orange-50', 'bg-blue-50', 'bg-green-50'];
              const poolShare = poolConfig.teamPoolPercentages[index] || 2;
              const poolAmount = Math.round(poolConfig.totalPool * (poolShare / 100));

              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-2 ${bgColors[index]} rounded-lg`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? 'bg-yellow-500 text-white'
                          : index === 1
                          ? 'bg-gray-400 text-white'
                          : index === 2
                          ? 'bg-orange-400 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="font-medium text-sm">{member.name.split(' ')[0]}</span>
                  </div>
                  <span className="font-bold text-green-600 text-sm">
                    {formatCurrency(poolAmount)}{' '}
                    <span className="text-xs text-gray-500">({poolShare}%)</span>
                  </span>
                </div>
              );
            })}
            {teamMembers.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-2">No team members yet</p>
            )}
          </div>
        </div>

        {/* Team Earnings */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <span>👥</span> Team Earnings
            </h2>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Auto</span>
          </div>
          <div className="divide-y">
            {teamMembers.map((member, index) => (
              <div key={member.id} className="p-4 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0
                      ? 'bg-yellow-500'
                      : index === 1
                      ? 'bg-gray-400'
                      : index === 2
                      ? 'bg-orange-400'
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">
                    {member.stats.winCount} wins • {formatShortCurrency(member.stats.revenue)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    {formatCurrency(member.incentive?.projected || 0)}
                  </p>
                  <p className="text-xs text-gray-500">Projected</p>
                </div>
              </div>
            ))}
            {teamMembers.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No team members yet. Add your first team member!
              </div>
            )}
          </div>
        </div>

        {/* Add Team Member Button */}
        <button
          onClick={() => setShowAddMember(true)}
          className="w-full bg-purple-600 text-white rounded-xl py-4 font-bold shadow-lg hover:bg-purple-700 transition-colors"
        >
          + Add Team Member
        </button>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg pb-safe">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => router.push('/manager/dashboard')}
            className="flex flex-col items-center p-2 text-purple-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </button>
          <button
            onClick={() => setShowAddMember(true)}
            className="flex flex-col items-center p-2 text-gray-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs">Team</span>
          </button>
          <button
            onClick={() => router.push('/manager/incentives')}
            className="flex flex-col items-center p-2 text-gray-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs">Reports</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center p-2 text-gray-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>

      {/* Add Team Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-slide-up">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Team Member</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newMemberForm.name}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (10 digits)</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={newMemberForm.phone}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newMemberForm.role}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value as 'staff' | 'sales_rep' })}
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="sales_rep">Sales Representative</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN (4 digits)</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={newMemberForm.pin}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, pin: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="••••"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
                >
                  Add Member
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
