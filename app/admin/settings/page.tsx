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
  const [logoUrl, setLogoUrl] = useState('');
  const [googleReviewQrUrl, setGoogleReviewQrUrl] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

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
        setLogoUrl(org.logo_url || '');
        setGoogleReviewQrUrl(org.google_review_qr_url || '');
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be less than 2MB');
      return;
    }

    setUploadingLogo(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
        setUploadingLogo(false);
      };
      reader.onerror = () => {
        alert('Failed to read file');
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert('Failed to upload logo');
      setUploadingLogo(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('QR code must be less than 2MB');
      return;
    }

    setUploadingQr(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setGoogleReviewQrUrl(reader.result as string);
        setUploadingQr(false);
      };
      reader.onerror = () => {
        alert('Failed to read file');
        setUploadingQr(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert('Failed to upload QR code');
      setUploadingQr(false);
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
          logoUrl,
          googleReviewQrUrl,
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

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setCategories(categories.filter((cat) => cat.id !== categoryId));
        alert('Category deleted successfully');
      } else {
        alert(data.error || 'Failed to delete category');
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
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Organization Details</h2>
          <form onSubmit={handleSaveOrganization} className="space-y-4">
            {/* Logo Upload */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Organization Logo
              </label>
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <div className="w-24 h-24 border-2 border-gray-300 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt="Organization Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG up to 2MB. Recommended: 200x200px
                  </p>
                  {uploadingLogo && (
                    <p className="text-sm text-blue-600 mt-1">Uploading...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Google Review QR Code Upload */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Google Review QR Code
              </label>
              <div className="flex items-center gap-4">
                {googleReviewQrUrl && (
                  <div className="w-24 h-24 border-2 border-gray-300 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={googleReviewQrUrl}
                      alt="Google Review QR Code"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    disabled={uploadingQr}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload your Google Review QR code. This will be shown when a sale is completed.
                  </p>
                  {uploadingQr && (
                    <p className="text-sm text-green-600 mt-1">Uploading...</p>
                  )}
                </div>
              </div>
            </div>

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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg px-6 py-3 mb-6 shadow-md">
            <h2 className="text-lg font-semibold text-white">Product Categories</h2>
          </div>

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

          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 bg-gray-100 rounded-lg border border-gray-300 hover:bg-gray-200 hover:shadow-md transition-all"
              >
                <span className="font-semibold text-gray-800">{category.name}</span>
                <button
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Delete
                </button>
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
