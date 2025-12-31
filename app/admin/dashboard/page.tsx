'use client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeadWithDetails } from '@/lib/types';

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
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // Redirect if not admin
      if (parsedUser.role !== 'admin') {
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

    const repsData: SalesRepData[] = Object.entries(grouped).map(([repId, repLeads]) => ({
      id: repId,
      name: repLeads[0]?.sales_rep_name || 'Unknown',
      leads: repLeads,
      totalLeads: repLeads.length,
      expanded: false,
    }));

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

  const exportToCSV = (rep: SalesRepData) => {
    const headers = ['Customer Name', 'Phone', 'Status', 'Category', 'Model/Invoice', 'Amount', 'Timeline', 'Reason', 'Date'];
    const rows = rep.leads.map((lead) => [
      lead.customer_name,
      lead.customer_phone,
      lead.status?.toUpperCase() || 'UNKNOWN',
      lead.category_name || '',
      lead.status === 'win' ? (lead.invoice_no || 'N/A') : (lead.model_name || 'Unknown'),
      lead.status === 'win' ? (lead.sale_price || 0) : (lead.deal_size || 0),
      lead.status === 'win' ? 'Completed' : (lead.purchase_timeline || 'Unknown'),
      lead.status === 'win' ? '' : (lead.not_today_reason || ''),
      new Date(lead.created_at).toLocaleDateString('en-IN'),
    ]);

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
          <div className="space-y-3">
            {salesReps.map((rep) => (
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
                      <h3 className="font-semibold text-lg">{rep.name}</h3>
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
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rep.leads.map((lead) => {
                          const isWin = lead.status === 'win';
                          const rowClass = isWin ? 'bg-green-50' : 'bg-red-50';

                          return (
                            <tr key={lead.id} className={`border-t hover:opacity-90 ${rowClass}`}>
                              <td className="px-4 py-3">{lead.customer_name}</td>
                              <td className="px-4 py-3">{lead.customer_phone}</td>
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
                              <td className="px-4 py-3">{lead.category_name}</td>
                              <td className="px-4 py-3">
                                {isWin ? (lead.invoice_no || 'N/A') : (lead.model_name || 'Unknown')}
                              </td>
                              <td className={`px-4 py-3 font-semibold ${isWin ? 'text-green-600' : 'text-blue-600'}`}>
                                ₹{(isWin ? (lead.sale_price || 0) : (lead.deal_size || 0)).toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3">
                                {isWin ? 'Completed' : (lead.purchase_timeline || 'Unknown')}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {formatDate(lead.created_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
