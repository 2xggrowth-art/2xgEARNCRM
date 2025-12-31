'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';

export default function AdminTeamPage() {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const response = await fetch('/api/admin/team');
      const data = await response.json();

      if (data.success) {
        setTeamMembers(data.data);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    try {
      const response = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMemberName,
          phone: newMemberPhone,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          `Sales rep added successfully!\n\n${
            data.data.otp
              ? `Their OTP is: ${data.data.otp}\nShare this with ${newMemberName} to login.`
              : 'OTP has been sent to their phone.'
          }`
        );
        setTeamMembers([data.data.user, ...teamMembers]);
        setNewMemberName('');
        setNewMemberPhone('');
        setShowAddForm(false);
      } else {
        alert(data.error || 'Failed to add team member');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setAdding(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-blue-600 hover:underline mb-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-xl font-bold text-gray-900">Team Management</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Add New Member Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-blue-600 text-white rounded-lg py-4 px-6 text-lg font-semibold hover:bg-blue-700 mb-6"
          >
            + Add Sales Rep
          </button>
        )}

        {/* Add Member Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Add New Sales Rep</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter sales rep name"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={newMemberPhone}
                  onChange={(e) =>
                    setNewMemberPhone(e.target.value.replace(/\D/g, ''))
                  }
                  className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
                  placeholder="10-digit mobile"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewMemberName('');
                    setNewMemberPhone('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 rounded-lg py-3 px-6 font-semibold hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {adding ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Team Members List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900">Team Members</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Loading team members...
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No team members yet. Add your first sales rep above.
            </div>
          ) : (
            <div className="divide-y">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{member.name}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            member.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {member.role === 'admin' ? 'Admin' : 'Sales Rep'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{member.phone}</p>
                      <div className="text-sm text-gray-500">
                        <div>
                          Joined: {formatDate(member.created_at)}
                        </div>
                        <div>
                          Last Login: {formatDate(member.last_login)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
