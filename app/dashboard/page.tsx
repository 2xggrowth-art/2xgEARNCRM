'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LeadWithDetails } from '@/lib/types';

// Force dynamic rendering - don't prerender this page
export const dynamic = 'force-dynamic';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');

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

      {/* Action Button */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <button
          onClick={() => router.push('/lead/new')}
          className="w-full bg-blue-600 text-white rounded-lg py-4 px-6 font-semibold text-lg hover:bg-blue-700 shadow-lg"
        >
          + Create New Lead
        </button>
      </div>

      {/* Leads List */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="bg-white rounded-lg shadow-sm">
          {leads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No leads yet. Create your first lead!
            </div>
          ) : (
            <div className="divide-y">
              {leads.map((lead) => {
                const isWin = lead.status === 'win';
                const cardClass = isWin ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500';

                return (
                  <div key={lead.id} className={`p-4 hover:opacity-90 ${cardClass}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{lead.customer_name}</h3>
                          {isWin ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                              ✓ Win
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                              ✗ Lost
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600">{lead.customer_phone}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${isWin ? 'text-green-600' : 'text-blue-600'}`}>
                          ₹{(isWin ? (lead.sale_price || 0) : (lead.deal_size || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Category: </span>
                        <span className="text-gray-900">{lead.category_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{isWin ? 'Invoice' : 'Model'}: </span>
                        <span className="text-gray-900">
                          {isWin ? (lead.invoice_no || 'N/A') : (lead.model_name || 'Unknown')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Timeline: </span>
                        <span className="text-gray-900">
                          {isWin ? 'Completed' : (
                            lead.purchase_timeline === 'today'
                              ? 'Today'
                              : lead.purchase_timeline === '3_days'
                              ? '3 Days'
                              : lead.purchase_timeline === '7_days'
                              ? '7 Days'
                              : '30 Days'
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Created: </span>
                        <span className="text-gray-900">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {!isWin && lead.not_today_reason && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Reason: </span>
                        <span className="text-gray-900">
                          {lead.not_today_reason === 'need_family_approval'
                            ? 'Need family approval'
                            : lead.not_today_reason === 'price_high'
                            ? 'Price too high'
                            : lead.not_today_reason === 'want_more_options'
                            ? 'Want more options'
                            : 'Just browsing'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
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
