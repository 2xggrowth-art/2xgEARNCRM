'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SystemStats {
  overview: {
    totalOrganizations: number;
    totalUsers: number;
    totalLeads: number;
    winLeads: number;
    lostLeads: number;
    totalRevenue: number;
    conversionRate: number;
  };
  usersByRole: {
    super_admin: number;
    manager: number;
    staff: number;
    sales_rep: number;
  };
  recentActivity: {
    newLeadsThisWeek: number;
    newUsersThisWeek: number;
  };
  topOrganizations: Array<{
    organizationId: string;
    organizationName: string;
    leadCount: number;
  }>;
}

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  contact_number: string | null;
  created_at: string;
  userCount: number;
  leadCount: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const [newOrgForm, setNewOrgForm] = useState({
    name: '',
    contactNumber: '',
    adminName: '',
    adminPhone: '',
    adminPin: '',
  });

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'super_admin') {
      router.push('/login');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch stats
      const statsRes = await fetch('/api/super-admin/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      // Fetch organizations
      const orgsRes = await fetch('/api/super-admin/organizations', { headers });
      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        setOrganizations(orgsData.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/super-admin/organizations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newOrgForm),
      });

      const data = await res.json();

      if (data.success) {
        alert('Organization created successfully!');
        setShowCreateOrg(false);
        setNewOrgForm({
          name: '',
          contactNumber: '',
          adminName: '',
          adminPhone: '',
          adminPin: '',
        });
        fetchData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Failed to create organization');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
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
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Stats */}
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Total Organizations</div>
                <div className="text-3xl font-bold text-blue-600">
                  {stats.overview.totalOrganizations}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Total Users</div>
                <div className="text-3xl font-bold text-green-600">
                  {stats.overview.totalUsers}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Total Leads</div>
                <div className="text-3xl font-bold text-purple-600">
                  {stats.overview.totalLeads}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Total Revenue</div>
                <div className="text-3xl font-bold text-yellow-600">
                  ₹{stats.overview.totalRevenue.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Super Admins:</span>
                    <span className="font-bold text-gray-900 text-lg">{stats.usersByRole.super_admin}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Managers:</span>
                    <span className="font-bold text-gray-900 text-lg">{stats.usersByRole.manager}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Staff:</span>
                    <span className="font-bold text-gray-900 text-lg">{stats.usersByRole.staff}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Sales Reps:</span>
                    <span className="font-bold text-gray-900 text-lg">{stats.usersByRole.sales_rep}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity (7 Days)</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">New Leads:</span>
                    <span className="font-bold text-green-600 text-lg">
                      {stats.recentActivity.newLeadsThisWeek}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">New Users:</span>
                    <span className="font-bold text-blue-600 text-lg">
                      {stats.recentActivity.newUsersThisWeek}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Conversion Rate:</span>
                    <span className="font-bold text-purple-600 text-lg">
                      {stats.overview.conversionRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Organizations List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Organizations</h2>
            <button
              onClick={() => setShowCreateOrg(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + New Organization
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Leads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{org.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {org.contact_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                        {org.userCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                        {org.leadCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Organization Modal */}
      {showCreateOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Organization</h2>
            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={newOrgForm.name}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number (Optional)
                </label>
                <input
                  type="tel"
                  value={newOrgForm.contactNumber}
                  onChange={(e) =>
                    setNewOrgForm({ ...newOrgForm, contactNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <hr className="my-4" />
              <h3 className="font-semibold text-gray-900">Manager Details</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager Name
                </label>
                <input
                  type="text"
                  required
                  value={newOrgForm.adminName}
                  onChange={(e) =>
                    setNewOrgForm({ ...newOrgForm, adminName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager Phone (10 digits)
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={newOrgForm.adminPhone}
                  onChange={(e) =>
                    setNewOrgForm({ ...newOrgForm, adminPhone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager PIN (4 digits)
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={newOrgForm.adminPin}
                  onChange={(e) =>
                    setNewOrgForm({ ...newOrgForm, adminPin: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateOrg(false)}
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
