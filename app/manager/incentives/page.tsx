'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PenaltyType, PENALTY_PERCENTAGES } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface IncentiveSummary {
  pending_count: number;
  approved_count: number;
  paid_count: number;
  total_gross: number;
  total_net: number;
  total_penalties: number;
  disputed_penalties_count: number;
}

interface TeamIncentive {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  month: string;
  gross_commission: number;
  streak_bonus: number;
  review_bonus: number;
  total_bonuses: number;
  penalty_count: number;
  penalty_percentage: number;
  penalty_amount: number;
  net_incentive: number;
  salary_cap_applied: boolean;
  capped_amount: number | null;
  final_approved_amount: number | null;
  status: string;
}

interface DisputedPenalty {
  id: string;
  user_id: string;
  user_name: string;
  penalty_type: string;
  penalty_percentage: number;
  description: string | null;
  dispute_reason: string | null;
  incident_date: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  phone: string;
}

export default function ManagerIncentivesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [summary, setSummary] = useState<IncentiveSummary | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<TeamIncentive[]>([]);
  const [allIncentives, setAllIncentives] = useState<TeamIncentive[]>([]);
  const [disputedPenalties, setDisputedPenalties] = useState<DisputedPenalty[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'penalties' | 'targets'>('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedIncentive, setSelectedIncentive] = useState<TeamIncentive | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [finalAmount, setFinalAmount] = useState<number | null>(null);

  // Penalty form
  const [penaltyForm, setPenaltyForm] = useState({
    user_id: '',
    penalty_type: '' as PenaltyType | '',
    description: '',
    incident_date: '',
  });

  // Target form
  const [targetForm, setTargetForm] = useState({
    user_id: '',
    target_amount: 1000000,
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'manager' && parsedUser.role !== 'super_admin') {
      router.push('/login');
      return;
    }

    setUser(parsedUser);
    fetchData();
    fetchTeamMembers();
  }, [router, month]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/earn/manager?month=${month}`);
      const data = await res.json();

      if (data.success) {
        setSummary(data.data.summary);
        setPendingApprovals(data.data.pending_approvals || []);
        setAllIncentives(data.data.all_incentives || []);
        setDisputedPenalties(data.data.disputed_penalties || []);
      }
    } catch (error) {
      console.error('Error fetching manager data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/manager/team');
      const data = await res.json();
      if (data.success) {
        setTeamMembers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatMonth = (monthStr: string) => {
    const [year, monthNum] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      calculating: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Calculating' },
      pending_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
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

  const handleApprove = async (approved: boolean) => {
    if (!selectedIncentive) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/earn/manager/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incentive_id: selectedIncentive.id,
          approved,
          review_notes: reviewNotes,
          final_amount: finalAmount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowApproveModal(false);
        setSelectedIncentive(null);
        setReviewNotes('');
        setFinalAmount(null);
        fetchData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to process approval');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      alert('Please select incentives to approve');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/earn/manager/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incentive_ids: selectedIds,
          review_notes: 'Bulk approved by manager',
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedIds([]);
        fetchData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error bulk approving:', error);
      alert('Failed to bulk approve');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    if (selectedIds.length === 0) {
      alert('Please select approved incentives to mark as paid');
      return;
    }

    const reference = prompt('Enter payment reference (optional):');

    setProcessing(true);
    try {
      const res = await fetch('/api/earn/manager/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incentive_ids: selectedIds,
          payment_reference: reference || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedIds([]);
        fetchData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error marking paid:', error);
      alert('Failed to mark as paid');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreatePenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!penaltyForm.user_id || !penaltyForm.penalty_type) {
      alert('Please select user and penalty type');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/earn/penalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...penaltyForm,
          incident_date: penaltyForm.incident_date || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowPenaltyModal(false);
        setPenaltyForm({ user_id: '', penalty_type: '', description: '', incident_date: '' });
        fetchData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating penalty:', error);
      alert('Failed to create penalty');
    } finally {
      setProcessing(false);
    }
  };

  const handleResolvePenalty = async (penaltyId: string, resolution: 'active' | 'waived') => {
    const notes = prompt(`Resolution notes for ${resolution === 'waived' ? 'waiving' : 'upholding'} penalty:`);

    setProcessing(true);
    try {
      const res = await fetch(`/api/earn/penalties/${penaltyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          resolution,
          resolution_notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error resolving penalty:', error);
      alert('Failed to resolve penalty');
    } finally {
      setProcessing(false);
    }
  };

  const handleSetTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetForm.user_id) {
      alert('Please select a user');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/earn/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: targetForm.user_id,
          month,
          target_amount: targetForm.target_amount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowTargetModal(false);
        setTargetForm({ user_id: '', target_amount: 1000000 });
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error setting target:', error);
      alert('Failed to set target');
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalizeMonth = async () => {
    if (!confirm(`Finalize all incentives for ${formatMonth(month)}? This will submit them for review.`)) {
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/earn/incentives/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error finalizing:', error);
      alert('Failed to finalize month');
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (items: TeamIncentive[]) => {
    const ids = items.map((i) => i.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">2XG EARN Manager</h1>
            <p className="text-sm text-gray-500">{formatMonth(month)}</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => router.push('/manager/dashboard')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Pending Approval</div>
              <div className="text-3xl font-bold text-yellow-600">{summary.pending_count}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Approved</div>
              <div className="text-3xl font-bold text-green-600">{summary.approved_count}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Net Incentives</div>
              <div className="text-3xl font-bold text-blue-600">{formatCurrency(summary.total_net)}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Disputed Penalties</div>
              <div className="text-3xl font-bold text-red-600">{summary.disputed_penalties_count}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleFinalizeMonth}
            disabled={processing}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Finalize Month
          </button>
          <button
            onClick={() => setShowPenaltyModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            + Add Penalty
          </button>
          <button
            onClick={() => setShowTargetModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Set Target
          </button>
          {selectedIds.length > 0 && activeTab === 'pending' && (
            <button
              onClick={handleBulkApprove}
              disabled={processing}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Approve Selected ({selectedIds.length})
            </button>
          )}
          {selectedIds.length > 0 && activeTab === 'all' && (
            <button
              onClick={handleMarkPaid}
              disabled={processing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Mark Paid ({selectedIds.length})
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          {[
            { key: 'pending', label: `Pending (${pendingApprovals.length})` },
            { key: 'all', label: 'All Incentives' },
            { key: 'penalties', label: `Disputed (${disputedPenalties.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                setSelectedIds([]);
              }}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pending Approvals Tab */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No pending approvals
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={pendingApprovals.every((i) => selectedIds.includes(i.id))}
                          onChange={() => toggleSelectAll(pendingApprovals)}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Commission</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Bonuses</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Penalties</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Net</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingApprovals.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{item.user_name}</div>
                          <div className="text-xs text-gray-500">{item.user_phone}</div>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.gross_commission)}</td>
                        <td className="px-4 py-3 text-right text-green-600">
                          +{formatCurrency(item.total_bonuses)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          -{formatCurrency(item.penalty_amount)}
                          {item.penalty_count > 0 && (
                            <span className="text-xs text-gray-500 ml-1">({item.penalty_count})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(item.capped_amount || item.net_incentive)}
                          {item.salary_cap_applied && (
                            <span className="text-xs text-orange-500 ml-1">(capped)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedIncentive(item);
                              setFinalAmount(item.capped_amount || item.net_incentive);
                              setShowApproveModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* All Incentives Tab */}
        {activeTab === 'all' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {allIncentives.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No incentives this month
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={allIncentives.filter(i => i.status === 'approved').every((i) => selectedIds.includes(i.id))}
                          onChange={() => toggleSelectAll(allIncentives.filter(i => i.status === 'approved'))}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Commission</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Bonuses</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Penalties</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Final</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allIncentives.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {item.status === 'approved' && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={() => toggleSelect(item.id)}
                              className="rounded"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{item.user_name}</div>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.gross_commission)}</td>
                        <td className="px-4 py-3 text-right text-green-600">
                          +{formatCurrency(item.total_bonuses)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          -{formatCurrency(item.penalty_amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(item.final_approved_amount || item.net_incentive)}
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Disputed Penalties Tab */}
        {activeTab === 'penalties' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {disputedPenalties.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No disputed penalties
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {disputedPenalties.map((penalty) => (
                  <div key={penalty.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{penalty.user_name}</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {penalty.penalty_type.replace(/_/g, ' ')} - {penalty.penalty_percentage}%
                        </p>
                        {penalty.description && (
                          <p className="text-sm text-gray-500 mt-1">{penalty.description}</p>
                        )}
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        Disputed
                      </span>
                    </div>
                    {penalty.dispute_reason && (
                      <div className="bg-yellow-50 rounded p-3 mb-3">
                        <p className="text-sm text-yellow-800">
                          <span className="font-medium">Dispute reason:</span> {penalty.dispute_reason}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolvePenalty(penalty.id, 'active')}
                        disabled={processing}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 disabled:opacity-50"
                      >
                        Uphold Penalty
                      </button>
                      <button
                        onClick={() => handleResolvePenalty(penalty.id, 'waived')}
                        disabled={processing}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 disabled:opacity-50"
                      >
                        Waive Penalty
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Approve Modal */}
      {showApproveModal && selectedIncentive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Review Incentive</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{selectedIncentive.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Commission:</span>
                <span>{formatCurrency(selectedIncentive.gross_commission)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bonuses:</span>
                <span className="text-green-600">+{formatCurrency(selectedIncentive.total_bonuses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Penalties:</span>
                <span className="text-red-600">-{formatCurrency(selectedIncentive.penalty_amount)}</span>
              </div>
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Net Incentive:</span>
                <span>{formatCurrency(selectedIncentive.net_incentive)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Final Amount (adjust if needed)
              </label>
              <input
                type="number"
                value={finalAmount || ''}
                onChange={(e) => setFinalAmount(parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add review notes..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(true)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => handleApprove(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedIncentive(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Penalty Modal */}
      {showPenaltyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Penalty</h2>

            <form onSubmit={handleCreatePenalty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Member
                </label>
                <select
                  value={penaltyForm.user_id}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, user_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select team member</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Penalty Type
                </label>
                <select
                  value={penaltyForm.penalty_type}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, penalty_type: e.target.value as PenaltyType })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select penalty type</option>
                  {Object.entries(PENALTY_PERCENTAGES).map(([type, pct]) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ')} (-{pct}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={penaltyForm.description}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the incident..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Incident Date
                </label>
                <input
                  type="date"
                  value={penaltyForm.incident_date}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, incident_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Add Penalty
                </button>
                <button
                  type="button"
                  onClick={() => setShowPenaltyModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Set Monthly Target</h2>

            <form onSubmit={handleSetTarget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Member
                </label>
                <select
                  value={targetForm.user_id}
                  onChange={(e) => setTargetForm({ ...targetForm, user_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select team member</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Amount (₹)
                </label>
                <input
                  type="number"
                  value={targetForm.target_amount}
                  onChange={(e) => setTargetForm({ ...targetForm, target_amount: parseInt(e.target.value) || 0 })}
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Default: ₹10,00,000 (10 Lakhs)</p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Set Target
                </button>
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
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
