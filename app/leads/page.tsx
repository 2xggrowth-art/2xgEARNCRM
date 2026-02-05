'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeadWithDetails } from '@/lib/types';
import { MobileLayout } from '@/components/mobile';

export const dynamic = 'force-dynamic';

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads/my-leads');
      const data = await response.json();
      if (data.success) {
        // Filter to only show lost leads (sales reps can't see win leads)
        setLeads(data.data.filter((lead: LeadWithDetails) => lead.status === 'lost'));
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getTimelineLabel = (timeline: string | null | undefined) => {
    const labels: Record<string, string> = {
      today: 'Today',
      '3_days': '3 Days',
      '7_days': '7 Days',
      '30_days': '30 Days',
    };
    return labels[timeline || ''] || timeline || '-';
  };

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.customer_name.toLowerCase().includes(query) ||
      lead.customer_phone.includes(query)
    );
  });

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-500">Loading leads...</div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-40 border-b shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-2xl">
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">My Leads</h1>
            <p className="text-xs text-gray-500">Lost leads only (Win hidden)</p>
          </div>
          <button
            onClick={() => router.push('/lead/new')}
            className="btn-mobile bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            + Add
          </button>
        </div>
        <input
          type="text"
          placeholder="Search name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full mt-3 px-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Leads List */}
      <div className="p-4 space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <p className="text-gray-500">
              {searchQuery ? 'No leads match your search' : 'No lost leads yet'}
            </p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-bold text-gray-900">{lead.customer_name}</p>
                  <p className="text-xs text-gray-500">
                    {lead.category_name} • {formatCurrency(lead.deal_size || 0)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Timeline: {getTimelineLabel(lead.purchase_timeline)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                    Lost
                  </span>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(lead.created_at)}</p>
                </div>
              </div>
              {/* WhatsApp Follow-up Button */}
              <a
                href={`https://wa.me/91${lead.customer_phone}?text=${encodeURIComponent(
                  `Hi ${lead.customer_name}! This is from our store. We wanted to follow up on your recent visit. Please let us know if you have any questions!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full bg-green-500 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Follow-up on WhatsApp
              </a>
            </div>
          ))
        )}
      </div>
    </MobileLayout>
  );
}
