'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LeadWithDetails } from '@/lib/types';

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
  const [showSEMModal, setShowSEMModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [semCommitmentAccepted, setSemCommitmentAccepted] = useState(false);

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

      {/* Action Buttons Grid */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Button 1: Create New Lead */}
          <button
            onClick={() => router.push('/lead/new')}
            className="bg-blue-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-blue-700 shadow-md text-left"
          >
            1. CREATE NEW LEAD
          </button>

          {/* Button 2: Check My Incentive */}
          <button
            onClick={() => router.push('/my-incentives')}
            className="bg-green-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-green-700 shadow-md text-left"
          >
            2. CHECK MY INCENTIVE
          </button>

          {/* Button 3: Apply for SEM */}
          <button
            onClick={() => setShowSEMModal(true)}
            className="bg-purple-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-purple-700 shadow-md text-left"
          >
            3. Apply for SEM ⭐
          </button>

          {/* Button 4: Apply for Promotion */}
          <button
            onClick={() => setShowPromotionModal(true)}
            className="bg-orange-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-orange-700 shadow-md text-left"
          >
            4. APPLY FOR PROMOTION
          </button>

          {/* Button 5: My Referral Earnings */}
          <button
            onClick={() => router.push('/my-referral-earnings')}
            className="bg-indigo-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-indigo-700 shadow-md text-left"
          >
            5. MY REFERRAL EARNINGS
          </button>

          {/* Button 6: Reports */}
          <button
            onClick={() => alert('Coming Soon')}
            className="bg-gray-700 text-white rounded-lg py-3 px-6 font-semibold hover:bg-gray-800 shadow-md text-left"
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

      {/* SEM Conditions Modal */}
      {showSEMModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Apply for SEM ⭐</h2>

            {/* Primary Acknowledgement Callout - Interactive */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-5 mb-6 shadow-lg border-2 border-purple-800">
              <div className="mb-4">
                <div className="flex items-start mb-4">
                  <div className="text-3xl mr-3">✓</div>
                  <div>
                    <h3 className="text-sm font-semibold text-purple-100 mb-1 uppercase tracking-wide">Primary Commitment</h3>
                    <p className="text-white font-bold text-lg leading-relaxed">
                      "I fully accept the system, hierarchy, SOPs, and accountability required to be an SEM."
                    </p>
                  </div>
                </div>
              </div>

              {/* Accept Button */}
              {!semCommitmentAccepted ? (
                <button
                  onClick={() => setSemCommitmentAccepted(true)}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  I Accept
                </button>
              ) : (
                <div className="flex items-center justify-center bg-green-500 text-white font-bold py-3 px-6 rounded-lg">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Accepted
                </div>
              )}
            </div>

            {/* Requirements List - Conditionally Rendered with Slide Animation */}
            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                semCommitmentAccepted ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Requirements & Standards:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-purple-600 font-bold mr-3 mt-0.5">•</span>
                    <div>
                      <span className="font-semibold text-gray-900">Compliance:</span>
                      <span className="text-gray-700 ml-1">96% compliance. No shortcuts, no parallel systems.</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 font-bold mr-3 mt-0.5">•</span>
                    <div>
                      <span className="font-semibold text-gray-900">Workflow:</span>
                      <span className="text-gray-700 ml-1">End-to-end support: Walk-in → Sales → Assembly → Delivery → Support.</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 font-bold mr-3 mt-0.5">•</span>
                    <div>
                      <span className="font-semibold text-gray-900">Lead Management:</span>
                      <span className="text-gray-700 ml-1">If a lead is lost, it must go through the manager level without fail.</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 font-bold mr-3 mt-0.5">•</span>
                    <div>
                      <span className="font-semibold text-gray-900">Client Relations:</span>
                      <span className="text-gray-700 ml-1">Highest respect to all clients—zero tolerance for disrespect.</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 font-bold mr-3 mt-0.5">•</span>
                    <div>
                      <span className="font-semibold text-gray-900">Documentation:</span>
                      <span className="text-gray-700 ml-1">CRM entries, job cards, service notes, and delivery updates are mandatory.</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 font-bold mr-3 mt-0.5">•</span>
                    <div>
                      <span className="font-semibold text-gray-900">Accuracy:</span>
                      <span className="text-gray-700 ml-1">Operational errors must be maintained at ≤1%.</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 font-bold mr-3 mt-0.5">•</span>
                    <div>
                      <span className="font-semibold text-gray-900">Culture:</span>
                      <span className="text-gray-700 ml-1">Treat all customers and teammates equally and respectfully.</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 font-bold mr-3 mt-0.5">•</span>
                    <div>
                      <span className="font-semibold text-gray-900">Attendance:</span>
                      <span className="text-gray-700 ml-1">No back-to-back offs without prior approval and proper handover.</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 font-bold mr-3 mt-0.5">•</span>
                    <div>
                      <span className="font-semibold text-gray-900">Standardization:</span>
                      <span className="text-gray-700 ml-1">96% adherence to S.O.P. for all prime responsibilities.</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 font-bold mr-3 mt-0.5">•</span>
                    <div>
                      <span className="font-semibold text-gray-900">Efficiency:</span>
                      <span className="text-gray-700 ml-1">Every task and sale must be closed within the predefined timeline.</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6 mb-6 text-center">
                <div className="text-4xl mb-2">🚀</div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Coming Soon</h3>
                <p className="text-gray-600">We're working on the SEM application process!</p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowSEMModal(false);
                setSemCommitmentAccepted(false);
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-3 px-4 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Promotion Modal */}
      {showPromotionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <button
              onClick={() => setShowPromotionModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <div className="text-8xl mb-4 animate-bounce">🚀</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">COMING SOON</h2>
              <p className="text-gray-600 text-lg">We're working on something amazing!</p>
            </div>

            <div className="flex justify-center space-x-2 mb-6">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      )}
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