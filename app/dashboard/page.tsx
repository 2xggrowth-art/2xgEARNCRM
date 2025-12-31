'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LeadWithDetails } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handleLogout = () => {
    document.cookie = 'auth_token=; path=/; max-age=0';
    localStorage.removeItem('user');
    router.push('/login');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTimelineLabel = (timeline: string) => {
    const labels: Record<string, string> = {
      today: 'Today',
      '3_days': '3 Days',
      '7_days': '7 Days',
      '30_days': '30 Days',
    };
    return labels[timeline] || timeline;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Leads</h1>
            {user && <p className="text-sm text-gray-600">{user.name}</p>}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 font-medium">
              ✓ Lead created successfully! WhatsApp message will be sent shortly.
            </p>
          </div>
        </div>
      )}

      {/* Add New Lead Button */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <button
          onClick={() => router.push('/lead/new')}
          className="w-full bg-blue-600 text-white rounded-lg py-4 px-6 text-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          + Add New Lead
        </button>
      </div>

      {/* Leads List */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading leads...</div>
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 mb-4">No leads yet</p>
            <p className="text-sm text-gray-400">
              Click &quot;Add New Lead&quot; to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {lead.customer_name}
                    </h3>
                    <p className="text-gray-600">{lead.customer_phone}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      ₹{lead.deal_size.toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(lead.created_at)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Model:</span>{' '}
                    <span className="font-medium">{lead.model_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Category:</span>{' '}
                    <span className="font-medium">{lead.category_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Timeline:</span>{' '}
                    <span className="font-medium">
                      {getTimelineLabel(lead.purchase_timeline)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">WhatsApp:</span>{' '}
                    <span
                      className={`font-medium ${
                        lead.whatsapp_sent ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {lead.whatsapp_sent ? 'Sent ✓' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
