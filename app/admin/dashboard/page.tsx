'use client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeadWithDetails } from '@/lib/types';
import LeadScoreBadge from '@/components/LeadScoreBadge';
import { calculateLeadScore, getLeadScoreCategory } from '@/lib/lead-score';

type FilterStatus = 'all' | 'win' | 'lost';
type SortBy = 'date' | 'amount' | 'name';
type DateFilter = 'all' | 'today' | 'last7days' | 'last30days' | 'custom';

interface SalesRepData {
  id: string;
  name: string;
  leads: LeadWithDetails[];
  totalLeads: number;
  expanded: boolean;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [salesReps, setSalesReps] = useState<SalesRepData[]>([]);
  const [filteredSalesReps, setFilteredSalesReps] = useState<SalesRepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterRep, setFilterRep] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [editingIncentive, setEditingIncentive] = useState<string | null>(null);
  const [incentiveAmount, setIncentiveAmount] = useState<string>('');
  const [showIncentiveModal, setShowIncentiveModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithDetails | null>(null);

  // Bulk selection state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [deletedLeads, setDeletedLeads] = useState<LeadWithDetails[]>([]);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // Redirect if not admin or manager
      if (parsedUser.role !== 'admin' && parsedUser.role !== 'manager') {
        router.push('/dashboard');
        return;
      }
    }

    fetchAllLeads();
    fetchOrganizationLogo();
  }, [router]);

  const fetchOrganizationLogo = async () => {
    try {
      const response = await fetch('/api/organization/logo');
      const data = await response.json();

      if (data.success && data.data?.logo_url) {
        setLogoUrl(data.data.logo_url);
      }
    } catch (error) {
      console.error('Error fetching organization logo:', error);
    }
  };

  const fetchAllLeads = async () => {
    try {
      const response = await fetch('/api/admin/leads');
      const data = await response.json();

      if (data.success) {
        groupLeadsBySalesRep(data.data);
      }
    } catch (error) {
      console.error('Error fetching admin leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupLeadsBySalesRep = (leads: LeadWithDetails[]) => {
    const grouped = leads.reduce((acc: Record<string, LeadWithDetails[]>, lead) => {
      const repId = lead.sales_rep_id || 'unknown';
      if (!acc[repId]) {
        acc[repId] = [];
      }
      acc[repId].push(lead);
      return acc;
    }, {});

    const repsData: SalesRepData[] = Object.entries(grouped).map(([repId, repLeads]) => {
      // Preserve the expanded state if this rep already exists
      const existingRep = salesReps.find(rep => rep.id === repId);
      return {
        id: repId,
        name: repLeads[0]?.sales_rep_name || 'Unknown',
        leads: repLeads,
        totalLeads: repLeads.length,
        expanded: existingRep?.expanded || false,
      };
    });

    setSalesReps(repsData);
  };

  const toggleExpanded = (repId: string) => {
    setSalesReps((prev) =>
      prev.map((rep) =>
        rep.id === repId ? { ...rep, expanded: !rep.expanded } : rep
      )
    );
  };

  const handleLogout = () => {
    document.cookie = 'auth_token=; path=/; max-age=0';
    localStorage.removeItem('user');
    router.push('/login');
  };

  const formatReason = (lead: LeadWithDetails) => {
    if (lead.status === 'win') return '';
    if (lead.not_today_reason === 'other' && lead.other_reason) {
      return `Other: ${lead.other_reason}`;
    }
    const reasonMap: Record<string, string> = {
      need_family_approval: 'Need family approval',
      price_high: 'Price concern',
      want_more_options: 'Want more options',
      just_browsing: 'Just browsing',
    };
    return reasonMap[lead.not_today_reason || ''] || lead.not_today_reason || '';
  };

  const handleIncentiveUpdate = async (leadId: string, hasIncentive: boolean | null, amount?: number) => {
    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          has_incentive: hasIncentive,
          incentive_amount: amount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the leads list without navigation
        await fetchAllLeads();
        return true;
      } else {
        alert(`Failed to update incentive: ${data.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('Error updating incentive:', error);
      alert('Failed to update incentive. Please try again.');
      return false;
    }
  };

  const exportToCSV = (rep: SalesRepData) => {
    const headers = ['Customer Name', 'Phone', 'Status', 'Category', 'Model/Invoice', 'Amount', 'Timeline', 'Reason', 'Review Status', 'Lead Score', 'Incentive', 'Date'];
    const rows = rep.leads.map((lead) => {
      const score = lead.status === 'lost' ? calculateLeadScore(lead) : 0;
      const category = lead.status === 'lost' ? getLeadScoreCategory(score) : null;

      let incentiveText = '-';
      if (lead.has_incentive === true && lead.incentive_amount) {
        incentiveText = `Yes - ₹${lead.incentive_amount}`;
      } else if (lead.has_incentive === false) {
        incentiveText = 'No';
      }

      return [
        lead.customer_name,
        lead.customer_phone,
        lead.status?.toUpperCase() || 'UNKNOWN',
        lead.category_name || '',
        lead.status === 'win' ? (lead.invoice_no || 'N/A') : (lead.model_name || 'Unknown'),
        lead.status === 'win' ? (lead.sale_price || 0) : (lead.deal_size || 0),
        lead.status === 'win' ? 'Completed' : (lead.purchase_timeline || 'Unknown'),
        formatReason(lead),
        lead.status === 'win' ? (lead.review_status === 'reviewed' ? 'Reviewed' : lead.review_status === 'yet_to_review' ? 'Yet to Review' : 'Pending') : '-',
        lead.status === 'lost' ? `${category?.label} (${score})` : '-',
        incentiveText,
        new Date(lead.created_at).toLocaleDateString('en-IN'),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${rep.name}_leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDeleteLead = async (leadId: string, customerName: string) => {
    if (!confirm(`Are you sure you want to delete the lead for ${customerName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the leads list
        fetchAllLeads();
      } else {
        alert(`Failed to delete lead: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead. Please try again.');
    }
  };

  // Bulk action handlers
  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = (repLeads: LeadWithDetails[]) => {
    const repLeadIds = repLeads.map(lead => lead.id);
    const allSelected = repLeadIds.every(id => selectedLeads.has(id));

    const newSelected = new Set(selectedLeads);
    if (allSelected) {
      // Deselect all
      repLeadIds.forEach(id => newSelected.delete(id));
    } else {
      // Select all
      repLeadIds.forEach(id => newSelected.add(id));
    }
    setSelectedLeads(newSelected);
  };

  const handleBulkDelete = () => {
    // Get all selected leads data
    const leadsToDelete: LeadWithDetails[] = [];
    salesReps.forEach(rep => {
      rep.leads.forEach(lead => {
        if (selectedLeads.has(lead.id)) {
          leadsToDelete.push(lead);
        }
      });
    });

    // Store deleted leads for undo
    setDeletedLeads(leadsToDelete);

    // Remove from UI optimistically
    const newSalesReps = salesReps.map(rep => ({
      ...rep,
      leads: rep.leads.filter(lead => !selectedLeads.has(lead.id)),
    }));
    setSalesReps(newSalesReps);

    // Clear selection
    setSelectedLeads(new Set());

    // Show undo toast
    setShowUndoToast(true);

    // Set timeout for actual deletion
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
    }

    const timeoutId = setTimeout(() => {
      performBulkDelete(leadsToDelete.map(lead => lead.id));
      setShowUndoToast(false);
      setDeletedLeads([]);
    }, 5000);

    setUndoTimeoutId(timeoutId);
  };

  const handleUndoDelete = () => {
    // Cancel the deletion timeout
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      setUndoTimeoutId(null);
    }

    // Restore deleted leads
    const restoredLeadIds = new Set(deletedLeads.map(lead => lead.id));
    const newSalesReps = salesReps.map(rep => {
      const restoredForThisRep = deletedLeads.filter(lead => lead.sales_rep_id === rep.id);
      return {
        ...rep,
        leads: [...rep.leads, ...restoredForThisRep],
      };
    });

    setSalesReps(newSalesReps);
    setDeletedLeads([]);
    setShowUndoToast(false);
  };

  const performBulkDelete = async (leadIds: string[]) => {
    try {
      const response = await fetch('/api/admin/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leadIds }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(`Failed to delete leads: ${data.error || 'Unknown error'}`);
        // Refresh to restore data
        fetchAllLeads();
      }
    } catch (error) {
      console.error('Error deleting leads:', error);
      alert('Failed to delete leads. Please try again.');
      // Refresh to restore data
      fetchAllLeads();
    }
  };

  // Filter and sort sales reps whenever state changes
  useEffect(() => {
    let result = salesReps.map(rep => {
      let filteredLeads = [...rep.leads];

      // Apply status filter
      if (filterStatus !== 'all') {
        filteredLeads = filteredLeads.filter(lead => lead.status === filterStatus);
      }

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        filteredLeads = filteredLeads.filter(lead => {
          const leadDate = new Date(lead.created_at);
          const leadDateOnly = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());

          if (dateFilter === 'today') {
            return leadDateOnly.getTime() === today.getTime();
          } else if (dateFilter === 'last7days') {
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            return leadDateOnly >= sevenDaysAgo;
          } else if (dateFilter === 'last30days') {
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            return leadDateOnly >= thirtyDaysAgo;
          } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
            const startDate = new Date(customStartDate);
            const endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999); // Include the entire end date
            return leadDate >= startDate && leadDate <= endDate;
          }
          return true;
        });
      }

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredLeads = filteredLeads.filter(lead =>
          lead.customer_name.toLowerCase().includes(query) ||
          lead.customer_phone.includes(query) ||
          (lead.invoice_no && lead.invoice_no.toLowerCase().includes(query)) ||
          (lead.model_name && lead.model_name.toLowerCase().includes(query))
        );
      }

      // Apply sorting
      filteredLeads.sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else if (sortBy === 'amount') {
          const amountA = a.status === 'win' ? (a.sale_price || 0) : (a.deal_size || 0);
          const amountB = b.status === 'win' ? (b.sale_price || 0) : (b.deal_size || 0);
          return amountB - amountA;
        } else if (sortBy === 'name') {
          return a.customer_name.localeCompare(b.customer_name);
        }
        return 0;
      });

      return {
        ...rep,
        leads: filteredLeads,
        totalLeads: filteredLeads.length,
      };
    });

    // Apply sales rep filter
    if (filterRep !== 'all') {
      result = result.filter(rep => rep.id === filterRep);
    }

    // Remove reps with no leads after filtering
    result = result.filter(rep => rep.totalLeads > 0);

    setFilteredSalesReps(result);
  }, [salesReps, filterStatus, filterRep, sortBy, searchQuery, dateFilter, customStartDate, customEndDate]);

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
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                {user && <p className="text-sm text-gray-600">{user.name}</p>}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:underline"
            >
              Logout
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin/team')}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 px-4 text-sm font-semibold hover:bg-blue-700"
            >
              Manage Team
            </button>
            <button
              onClick={() => router.push('/admin/settings')}
              className="flex-1 bg-gray-600 text-white rounded-lg py-2 px-4 text-sm font-semibold hover:bg-gray-700"
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading data...</div>
          </div>
        ) : salesReps.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 mb-4">No sales reps or leads yet</p>
            <button
              onClick={() => router.push('/admin/team')}
              className="text-blue-600 hover:underline"
            >
              Add your first sales rep
            </button>
          </div>
        ) : (
          <>
            {/* Filters and Search */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Search */}
                <div>
                  <input
                    type="text"
                    placeholder="Search customer, phone, invoice..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Filter by Sales Rep */}
                <div>
                  <select
                    value={filterRep}
                    onChange={(e) => setFilterRep(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Sales Reps</option>
                    {salesReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Status */}
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="win">✓ Win Only</option>
                    <option value="lost">✗ Lost Only</option>
                  </select>
                </div>

                {/* Filter by Date */}
                <div>
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      const value = e.target.value as DateFilter;
                      setDateFilter(value);
                      if (value !== 'custom') {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">📅 Today</option>
                    <option value="last7days">📅 Last 7 Days</option>
                    <option value="last30days">📅 Last 30 Days</option>
                    <option value="custom">📅 Custom Range</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="date">Sort: Newest First</option>
                    <option value="amount">Sort: Highest Amount</option>
                    <option value="name">Sort: Name A-Z</option>
                  </select>
                </div>
              </div>

              {/* Custom Date Range Inputs */}
              {dateFilter === 'custom' && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Results count */}
              <div className="mt-3 text-sm text-gray-600">
                Showing {filteredSalesReps.reduce((sum, rep) => sum + rep.totalLeads, 0)} leads
                {filterRep !== 'all' && ` from ${filteredSalesReps.find(r => r.id === filterRep)?.name}`}
                {filterStatus !== 'all' && ` (${filterStatus === 'win' ? 'Win' : 'Lost'} only)`}
                {dateFilter === 'today' && ' (Today)'}
                {dateFilter === 'last7days' && ' (Last 7 Days)'}
                {dateFilter === 'last30days' && ' (Last 30 Days)'}
                {dateFilter === 'custom' && customStartDate && customEndDate && ` (${new Date(customStartDate).toLocaleDateString('en-IN')} - ${new Date(customEndDate).toLocaleDateString('en-IN')})`}
              </div>
            </div>

            {/* Sales Reps List */}
            <div className="space-y-3">
            {filteredSalesReps.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                No leads match your filters
              </div>
            ) : (
              filteredSalesReps.map((rep) => (
              <div key={rep.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div
                  onClick={() => toggleExpanded(rep.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`transform transition-transform ${
                        rep.expanded ? 'rotate-90' : ''
                      }`}
                    >
                      ▶
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{rep.name}</h3>
                      <p className="text-sm text-gray-500">
                        Total Leads: {rep.totalLeads}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportToCSV(rep);
                    }}
                    className="bg-green-600 text-white rounded-lg py-2 px-4 text-sm font-semibold hover:bg-green-700"
                  >
                    Export CSV
                  </button>
                </div>

                {rep.expanded && (
                  <div className="border-t overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700 w-12">
                            <input
                              type="checkbox"
                              checked={rep.leads.length > 0 && rep.leads.every(lead => selectedLeads.has(lead.id))}
                              onChange={() => handleSelectAll(rep.leads)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Phone
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Category
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Model/Invoice
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Timeline
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Reason
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Review Status
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Lead Score
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Incentive
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rep.leads.map((lead) => {
                          const isWin = lead.status === 'win';
                          const rowClass = isWin ? 'bg-green-50' : 'bg-red-50';

                          return (
                            <tr key={lead.id} className={`border-t hover:opacity-90 ${rowClass}`}>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedLeads.has(lead.id)}
                                  onChange={() => handleSelectLead(lead.id)}
                                  className="w-4 h-4 cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-4 py-3 text-gray-900">{lead.customer_name}</td>
                              <td className="px-4 py-3 text-gray-900">{lead.customer_phone}</td>
                              <td className="px-4 py-3">
                                {isWin ? (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                                    ✓ Win
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                                    ✗ Lost
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-900">{lead.category_name}</td>
                              <td className="px-4 py-3 text-gray-900">
                                {isWin ? (lead.invoice_no || 'N/A') : (lead.model_name || 'Unknown')}
                              </td>
                              <td className={`px-4 py-3 font-semibold ${isWin ? 'text-green-600' : 'text-blue-600'}`}>
                                ₹{(isWin ? (lead.sale_price || 0) : (lead.deal_size || 0)).toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-gray-900">
                                {isWin ? 'Completed' : (lead.purchase_timeline || 'Unknown')}
                              </td>
                              <td className="px-4 py-3 text-gray-700 text-sm">
                                {isWin ? (
                                  <span className="text-gray-400">-</span>
                                ) : lead.not_today_reason === 'other' && lead.other_reason ? (
                                  <span className="italic">Other: {lead.other_reason}</span>
                                ) : lead.not_today_reason === 'need_family_approval' ? (
                                  'Need family approval'
                                ) : lead.not_today_reason === 'price_high' ? (
                                  'Price concern'
                                ) : lead.not_today_reason === 'want_more_options' ? (
                                  'Want more options'
                                ) : lead.not_today_reason === 'just_browsing' ? (
                                  'Just browsing'
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isWin ? (
                                  lead.review_status === 'reviewed' ? (
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                      ✓ Reviewed
                                    </span>
                                  ) : lead.review_status === 'yet_to_review' ? (
                                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                                      ⏳ Yet to Review
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                                      ⌛ Pending
                                    </span>
                                  )
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <LeadScoreBadge lead={lead} />
                              </td>
                              <td className="px-4 py-3">
                                {!isWin || lead.review_status === 'pending' || lead.review_status === 'yet_to_review' ? (
                                  // Lost leads OR Win leads not yet reviewed - always show "No"
                                  <span className="text-gray-500">No</span>
                                ) : lead.has_incentive === null || lead.has_incentive === undefined ? (
                                  // Initial state - show Yes/No buttons (Win leads with review_status === 'reviewed' only)
                                  <div className="flex gap-2">
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        await handleIncentiveUpdate(lead.id, false);
                                      }}
                                      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-semibold"
                                    >
                                      No
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLead(lead);
                                        setIncentiveAmount('');
                                        setShowIncentiveModal(true);
                                      }}
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                                    >
                                      Yes
                                    </button>
                                  </div>
                                ) : lead.has_incentive === false ? (
                                  // No incentive
                                  <span className="text-gray-600">No</span>
                                ) : (
                                  // Show amount
                                  <span className="text-green-600 font-semibold">
                                    ₹{lead.incentive_amount?.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {formatDate(lead.created_at)}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLead(lead.id, lead.customer_name);
                                  }}
                                  className="text-red-600 hover:text-red-800 font-semibold text-sm"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
            )}
          </div>
          </>
        )}
      </div>

      {/* Incentive Modal */}
      {showIncentiveModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Set Incentive Amount</h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-900 font-medium">Customer:</span>
                <span className="font-semibold text-gray-900">{selectedLead.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-900 font-medium">Category:</span>
                <span className="font-semibold text-gray-900">{selectedLead.category_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-900 font-medium">Amount:</span>
                <span className="font-semibold text-green-600">
                  ₹{(selectedLead.sale_price || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Incentive Amount
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-lg">₹</span>
                <input
                  type="number"
                  value={incentiveAmount}
                  onChange={(e) => setIncentiveAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowIncentiveModal(false);
                  setSelectedLead(null);
                  setIncentiveAmount('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const amount = parseFloat(incentiveAmount);
                  if (!isNaN(amount) && amount > 0) {
                    const success = await handleIncentiveUpdate(selectedLead.id, true, amount);
                    if (success) {
                      setShowIncentiveModal(false);
                      setSelectedLead(null);
                      setIncentiveAmount('');
                    }
                  } else {
                    alert('Please enter a valid amount');
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      {selectedLeads.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out">
          <div className="bg-gray-900 text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-6">
            <span className="font-semibold text-lg">
              {selectedLeads.size} lead{selectedLeads.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
            <button
              onClick={() => setSelectedLeads(new Set())}
              className="text-gray-300 hover:text-white font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {showUndoToast && (
        <div className="fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out">
          <div className="bg-gray-900 text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4 min-w-[300px]">
            <svg
              className="w-6 h-6 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div className="flex-1">
              <p className="font-semibold">
                {deletedLeads.length} lead{deletedLeads.length > 1 ? 's' : ''} deleted
              </p>
              <p className="text-sm text-gray-400">Action will complete in 5 seconds</p>
            </div>
            <button
              onClick={handleUndoDelete}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
