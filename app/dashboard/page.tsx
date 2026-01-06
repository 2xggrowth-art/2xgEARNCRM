'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LeadWithDetails } from '@/lib/types';
import LeadScoreBadge from '@/components/LeadScoreBadge';

// Force dynamic rendering - don't prerender this page
export const dynamic = 'force-dynamic';

type FilterStatus = 'all' | 'win' | 'lost';
type SortBy = 'date' | 'amount' | 'name';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Check if redirected with success
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }

    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchLeads();
    fetchOrganizationLogo();
  }, [searchParams]);

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads/my-leads');
      const data = await response.json();

      if (data.success) {
        setLeads(data.data);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Filter and sort leads whenever leads, filterStatus, sortBy, or searchQuery changes
  useEffect(() => {
    // Sales reps can only see Lost leads (Win leads are hidden)
    let result = leads.filter(lead => lead.status === 'lost');

    // Apply status filter (only if filterStatus is explicitly set to 'lost' or 'all')
    // Note: 'win' filter won't show anything for sales reps
    if (filterStatus === 'win') {
      result = []; // Sales reps cannot see Win leads
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(lead =>
        lead.customer_name.toLowerCase().includes(query) ||
        lead.customer_phone.includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
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

    setFilteredLeads(result);
  }, [leads, filterStatus, sortBy, searchQuery]);

  const handleLogout = () => {
    document.cookie = 'auth_token=; path=/; max-age=0';
    document.cookie = 'user=; path=/; max-age=0';
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
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
              <h1 className="text-xl font-bold text-gray-900">My Leads</h1>
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
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            Lead created successfully!
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Create New Lead - Primary Action */}
          <button
            onClick={() => router.push('/lead/new')}
            className="bg-blue-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-blue-700 shadow-md transition-colors"
          >
            1. CREATE NEW LEAD
          </button>

          {/* Check My Incentive */}
          <button
            onClick={() => alert('Coming soon: Check My Incentive')}
            className="bg-green-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-green-700 shadow-md transition-colors"
          >
            2. CHECK MY INCENTIVE
          </button>

          {/* Apply for SEM */}
          <button
            onClick={() => alert('Coming soon: Apply for SEM')}
            className="bg-purple-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-purple-700 shadow-md transition-colors"
          >
            3. Apply for SEM ⭐
          </button>

          {/* Apply for Promotion */}
          <button
            onClick={() => alert('Coming soon: Apply for Promotion')}
            className="bg-orange-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-orange-700 shadow-md transition-colors"
          >
            4. APPLY FOR PROMOTION
          </button>

          {/* My Referral Earnings */}
          <button
            onClick={() => alert('Coming soon: My Referral Earnings')}
            className="bg-indigo-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-indigo-700 shadow-md transition-colors"
          >
            5. MY REFERRAL EARNINGS
          </button>

          {/* Reports */}
          <button
            onClick={() => alert('Coming soon: Reports')}
            className="bg-gray-700 text-white rounded-lg py-3 px-6 font-semibold hover:bg-gray-800 shadow-md transition-colors"
          >
            6. REPORTS
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter by Status - Note: Sales reps only see Lost leads */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Leads (Lost Only)</option>
                <option value="lost">✗ Lost Only</option>
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

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredLeads.length} of {leads.length} leads
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {leads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No leads yet. Create your first lead!
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No leads match your filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Customer</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Phone</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Category</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Invoice/Model</th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-700">Amount</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Timeline</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Reason</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Lead Score</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLeads.map((lead) => {
                    const isWin = lead.status === 'win';
                    const borderClass = isWin ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500';

                    return (
                      <tr key={lead.id} className={`hover:bg-gray-50 ${borderClass}`}>
                        <td className="px-3 py-3">
                          {isWin ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold whitespace-nowrap">
                              ✓ Win
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold whitespace-nowrap">
                              ✗ Lost
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-900 font-medium">{lead.customer_name}</td>
                        <td className="px-3 py-3 text-gray-700">{lead.customer_phone}</td>
                        <td className="px-3 py-3 text-gray-700">{lead.category_name}</td>
                        <td className="px-3 py-3 text-gray-700">
                          {isWin ? (lead.invoice_no || 'N/A') : (lead.model_name || 'Unknown')}
                        </td>
                        <td className={`px-3 py-3 text-right font-semibold ${isWin ? 'text-green-600' : 'text-blue-600'}`}>
                          ₹{(isWin ? (lead.sale_price || 0) : (lead.deal_size || 0)).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          {isWin ? 'Completed' : (
                            lead.purchase_timeline === 'today'
                              ? 'Today'
                              : lead.purchase_timeline === '3_days'
                              ? '3 Days'
                              : lead.purchase_timeline === '7_days'
                              ? '7 Days'
                              : '30 Days'
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-700 text-sm">
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
                        <td className="px-3 py-3">
                          <LeadScoreBadge lead={lead} />
                        </td>
                        <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
