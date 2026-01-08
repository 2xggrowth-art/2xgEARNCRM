'use client';

import { useState, useEffect } from 'react';
import { saveWhatsAppCredentials, getWhatsAppStatus } from '@/app/actions/whatsapp';

interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
}

export default function WhatsAppSettings() {
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    loadExistingConfig();
  }, []);

  const loadExistingConfig = async () => {
    setLoading(true);
    try {
      const status = await getWhatsAppStatus();
      if (status.configured) {
        setConfigured(true);
        setBusinessName(status.businessName || '');
        setPhoneNumber(status.phoneNumber || '');
      }
    } catch (error) {
      console.error('Error loading WhatsApp config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchTemplates = async () => {
    if (!wabaId || !accessToken) {
      alert('Please enter Access Token and WABA ID first');
      return;
    }

    setFetchingTemplates(true);
    setTemplates([]);

    try {
      const url = `https://graph.facebook.com/v18.0/${wabaId}/message_templates`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        // Filter for approved templates only
        const approvedTemplates = data.data
          .filter((t: any) => t.status === 'APPROVED')
          .map((t: any) => ({
            id: t.id,
            name: t.name,
            language: t.language,
            status: t.status,
            category: t.category,
          }));

        setTemplates(approvedTemplates);

        if (approvedTemplates.length === 0) {
          alert('No approved templates found. Please create and get approval for templates in Meta Business Manager.');
        }
      } else {
        alert('No templates found');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      alert('Failed to fetch templates. Please check your credentials.');
    } finally {
      setFetchingTemplates(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessToken || !phoneNumberId || !wabaId) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const result = await saveWhatsAppCredentials({
        whatsapp_access_token: accessToken,
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        phone_number: phoneNumber,
        business_name: businessName,
        is_active: isActive,
      });

      if (result.success) {
        alert('WhatsApp settings saved successfully!');
        setConfigured(true);
      } else {
        alert(result.error || 'Failed to save WhatsApp settings');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save WhatsApp settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-gray-500">Loading WhatsApp settings...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg px-6 py-3 mb-6 shadow-md flex items-center gap-3">
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
        <h2 className="text-lg font-semibold text-white">WhatsApp Cloud API Settings</h2>
      </div>

      {configured && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">WhatsApp is configured</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Access Token */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            WhatsApp Access Token *
            <span className="text-sm font-normal text-gray-500 ml-2">(Permanent token recommended)</span>
          </label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-green-500 focus:outline-none font-mono text-sm"
            placeholder="EAAxxxxxxxxxxxxxx"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Get this from Meta for Developers → Your App → WhatsApp → API Setup
          </p>
        </div>

        {/* Phone Number ID */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Phone Number ID *
          </label>
          <input
            type="text"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-green-500 focus:outline-none font-mono"
            placeholder="102XXXXXXXXX"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Found in WhatsApp → API Setup → Phone Number ID
          </p>
        </div>

        {/* WABA ID */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            WhatsApp Business Account ID (WABA ID) *
          </label>
          <input
            type="text"
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-green-500 focus:outline-none font-mono"
            placeholder="123XXXXXXXXX"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Found in Settings → Business Settings → Accounts
          </p>
        </div>

        {/* Phone Number (Display) */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Phone Number (for display)
          </label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-green-500 focus:outline-none"
            placeholder="+91 98765 43210"
          />
        </div>

        {/* Business Name */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-green-500 focus:outline-none"
            placeholder="My Shop Name"
          />
        </div>

        {/* Fetch Templates Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleFetchTemplates}
            disabled={fetchingTemplates || !wabaId || !accessToken}
            className="w-full bg-blue-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {fetchingTemplates ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Fetching Templates...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Fetch My Approved Templates
              </>
            )}
          </button>
        </div>

        {/* Templates Dropdown */}
        {templates.length > 0 && (
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Select Template for Lost Leads
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-green-500 focus:outline-none"
            >
              <option value="">-- Select a template --</option>
              {templates.map((template) => (
                <option key={template.id} value={template.name}>
                  {template.name} ({template.language}) - {template.category}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This template will be used when sending WhatsApp messages to lost leads
            </p>
          </div>
        )}

        {/* Active Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-700">Enable WhatsApp Integration</p>
            <p className="text-sm text-gray-500">Turn on/off WhatsApp messaging feature</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save WhatsApp Settings
            </>
          )}
        </button>
      </form>

      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Meta for Developers</a></li>
          <li>Create or select your app, add WhatsApp product</li>
          <li>Generate a permanent access token</li>
          <li>Copy Phone Number ID and WABA ID from API Setup</li>
          <li>Create message templates in Meta Business Manager</li>
          <li>Wait for template approval (24-48 hours)</li>
          <li>Enter credentials above and fetch templates</li>
          <li>Select your preferred template for lost leads</li>
          <li>Save settings</li>
        </ol>
      </div>
    </div>
  );
}
