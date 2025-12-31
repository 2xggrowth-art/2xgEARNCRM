'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Organization, Category } from '@/lib/types';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [orgName, setOrgName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');
  const [whatsappAccessToken, setWhatsappAccessToken] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchOrganization();
    fetchCategories();
  }, []);

  const fetchOrganization = async () => {
    try {
      const response = await fetch('/api/admin/organization');
      const data = await response.json();

      if (data.success) {
        const org = data.data;
        setOrganization(org);
        setOrgName(org.name);
        setContactNumber(org.contact_number || '');
        setWhatsappPhoneNumberId(org.whatsapp_phone_number_id || '');
        setWhatsappAccessToken(org.whatsapp_access_token || '');
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();

      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/admin/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          contactNumber,
          whatsappPhoneNumberId,
          whatsappAccessToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Settings saved successfully');
        setOrganization(data.data);
      } else {
        alert(data.error || 'Failed to save settings');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newCategoryName.trim().length < 2) {
      alert('Category name must be at least 2 characters');
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName }),
      });

      const data = await response.json();

      if (data.success) {
        setCategories([...categories, data.data]);
        setNewCategoryName('');
        alert('Category added successfully');
      } else {
        alert(data.error || 'Failed to add category');
      }
    } catch (error) {
      alert('Network error');
    }
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
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-blue-600 hover:underline mb-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-xl font-bold text-gray-900">Organization Settings</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Organization Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Organization Details</h2>
          <form onSubmit={handleSaveOrganization} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Contact Number
              </label>
              <input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
                placeholder="Customer service number"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                WhatsApp Phone Number ID
              </label>
              <input
                type="text"
                value={whatsappPhoneNumberId}
                onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
                placeholder="From Meta Business Manager"
              />
              <p className="text-sm text-gray-500 mt-1">
                Get this from Meta Business Manager → WhatsApp → Phone Numbers
              </p>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                WhatsApp Access Token
              </label>
              <textarea
                value={whatsappAccessToken}
                onChange={(e) => setWhatsappAccessToken(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="Permanent access token from Meta"
              />
              <p className="text-sm text-gray-500 mt-1">
                Generate a permanent token from Meta Developer Console
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-blue-700 disabled:bg-gray-300"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* Categories Management */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Product Categories</h2>

          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
                placeholder="New category name"
              />
              <button
                onClick={handleAddCategory}
                className="bg-green-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-green-700"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="font-medium">{category.name}</span>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <p className="text-gray-500 text-center py-4">No categories yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
