'use client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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
  const [newMemberPin, setNewMemberPin] = useState('');
  const [addingRole, setAddingRole] = useState<'admin' | 'sales_rep'>('sales_rep');
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetting, setResetting] = useState(false);

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
        credentials: 'include',
        body: JSON.stringify({
          name: newMemberName,
          phone: newMemberPhone,
          pin: newMemberPin,
          role: addingRole,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const roleLabel = addingRole === 'admin' ? 'Admin' : 'Sales rep';
        alert(`${roleLabel} added successfully!\n\nThey can now login with:\nPhone: ${newMemberPhone}\nPIN: ${newMemberPin}`);
        setTeamMembers([data.data.user, ...teamMembers]);
        setNewMemberName('');
        setNewMemberPhone('');
        setNewMemberPin('');
        setAddingRole('sales_rep');
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

  const handleResetPin = async (userId: string) => {
    if (!resetNewPin || resetNewPin.length !== 4) {
      alert('PIN must be exactly 4 digits');
      return;
    }

    setResetting(true);

    try {
      const response = await fetch('/api/admin/team/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          newPin: resetNewPin,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`PIN reset successfully!\n\nNew PIN: ${resetNewPin}`);
        setResetUserId(null);
        setResetNewPin('');
      } else {
        alert(data.error || 'Failed to reset PIN');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setResetting(false);
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
        {/* Add New Member Buttons */}
        {!showAddForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => {
                setAddingRole('sales_rep');
                setShowAddForm(true);
              }}
              className="bg-blue-600 text-white rounded-lg py-4 px-6 text-lg font-semibold hover:bg-blue-700"
            >
              + Add Sales Rep
            </button>
            <button
              onClick={() => {
                setAddingRole('admin');
                setShowAddForm(true);
              }}
              className="bg-purple-600 text-white rounded-lg py-4 px-6 text-lg font-semibold hover:bg-purple-700"
            >
              + Add Admin
            </button>
          </div>
        )}

        {/* Add Member Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Add New {addingRole === 'admin' ? 'Admin' : 'Sales Rep'}
            </h2>
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
                  placeholder={`Enter ${addingRole === 'admin' ? 'admin' : 'sales rep'} name`}
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

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newMemberPin}
                  onChange={(e) =>
                    setNewMemberPin(e.target.value.replace(/\D/g, ''))
                  }
                  className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
                  placeholder="Set 4-digit PIN"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This PIN will be used for login. Share it securely with the {addingRole === 'admin' ? 'admin' : 'sales rep'}.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewMemberName('');
                    setNewMemberPhone('');
                    setNewMemberPin('');
                    setAddingRole('sales_rep');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 rounded-lg py-3 px-6 font-semibold hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding || newMemberPin.length !== 4}
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
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{member.name}</h3>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              member.role === 'manager' || member.role === 'super_admin'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {member.role === 'manager' ? 'Manager' : member.role === 'super_admin' ? 'Super Admin' : 'Sales Rep'}
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

                    {/* Reset PIN Section */}
                    {resetUserId === member.id ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Reset PIN for {member.name}
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={resetNewPin}
                            onChange={(e) =>
                              setResetNewPin(e.target.value.replace(/\D/g, ''))
                            }
                            className="flex-1 rounded-lg border-2 border-gray-300 p-2 focus:border-blue-500 focus:outline-none text-sm"
                            placeholder="New 4-digit PIN"
                          />
                          <button
                            onClick={() => handleResetPin(member.id)}
                            disabled={resetting || resetNewPin.length !== 4}
                            className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300"
                          >
                            {resetting ? 'Resetting...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => {
                              setResetUserId(null);
                              setResetNewPin('');
                            }}
                            className="bg-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setResetUserId(member.id)}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Reset PIN
                      </button>
                    )}
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
