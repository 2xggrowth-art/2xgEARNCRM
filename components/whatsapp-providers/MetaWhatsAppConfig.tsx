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

interface MetaWhatsAppConfigProps {
  isActive: boolean;
  onActiveChange: (value: boolean) => void;
  configured: boolean;
  onConfigured: (value: boolean) => void;
}

export default function MetaWhatsAppConfig({
  isActive,
  onActiveChange,
  configured,
  onConfigured,
}: MetaWhatsAppConfigProps) {
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const status = await getWhatsAppStatus();
      if (status.configured && (!status.provider || status.provider === 'meta')) {
        setBusinessName(status.businessName || '');
        setPhoneNumber(status.phoneNumber || '');

        const config = status.config as any;
        setAccessToken(config?.accessToken || '');
        setPhoneNumberId(config?.phoneNumberId || '');
        setWabaId(config?.wabaId || '');
        setSelectedTemplate(config?.selectedTemplate || '');
      }
    } catch (error) {
      console.error('Error loading Meta config:', error);
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
        provider: 'meta',
        config: {
          accessToken,
          phoneNumberId,
          wabaId,
          selectedTemplate,
        },
        phoneNumber,
        businessName,
        isActive,
      });

      if (result.success) {
        alert('Meta WhatsApp settings saved successfully!');
        onConfigured(true);
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

  return (
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
          className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none font-mono text-sm"
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
          className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none font-mono"
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
          className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none font-mono"
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
          className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
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
          className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
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
            className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
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
            onChange={(e) => onActiveChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Save Button */}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-blue-600 text-white rounded-lg py-3 px-6 font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            Save Meta WhatsApp Settings
          </>
        )}
      </button>

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
    </form>
  );
}
