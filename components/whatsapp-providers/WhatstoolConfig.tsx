'use client';

import { useState, useEffect } from 'react';
import { saveWhatsAppCredentials, getWhatsAppStatus } from '@/app/actions/whatsapp';

interface WhatstoolConfigProps {
  isActive: boolean;
  onActiveChange: (value: boolean) => void;
  configured: boolean;
  onConfigured: (value: boolean) => void;
}

export default function WhatstoolConfig({
  isActive,
  onActiveChange,
  configured,
  onConfigured,
}: WhatstoolConfigProps) {
  const [apiKey, setApiKey] = useState('');
  const [channelNumber, setChannelNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const status = await getWhatsAppStatus();
      if (status.configured && status.provider === 'whatstool') {
        const config = status.config as any;
        setApiKey(config?.apiKey || '');
        setChannelNumber(config?.channelNumber || '');
        setBusinessName(status.businessName || '');
      }
    } catch (error) {
      console.error('Error loading Whatstool config:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey || !channelNumber) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const result = await saveWhatsAppCredentials({
        provider: 'whatstool',
        config: {
          apiKey,
          channelNumber,
        },
        businessName,
        isActive,
      });

      if (result.success) {
        alert('Whatstool.business settings saved successfully!');
        onConfigured(true);
      } else {
        alert(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* API Key */}
      <div>
        <label className="block text-gray-700 font-medium mb-2">
          API Key *
          <span className="text-sm font-normal text-gray-500 ml-2">(From Whatstool Dashboard)</span>
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-green-500 focus:outline-none font-mono text-sm"
          placeholder="Your Whatstool API Key"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Generate API Key from Whatstool Dashboard → Developer API
        </p>
      </div>

      {/* Channel Number */}
      <div>
        <label className="block text-gray-700 font-medium mb-2">
          Channel Number *
        </label>
        <input
          type="text"
          value={channelNumber}
          onChange={(e) => setChannelNumber(e.target.value)}
          className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-green-500 focus:outline-none font-mono"
          placeholder="919876543210"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Your WhatsApp Business number (with country code, no + sign)
        </p>
      </div>

      {/* Business Name */}
      <div>
        <label className="block text-gray-700 font-medium mb-2">
          Business Name (Optional)
        </label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-green-500 focus:outline-none"
          placeholder="My Shop Name"
        />
      </div>

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
            Save Whatstool Settings
          </>
        )}
      </button>

      {/* Help Section */}
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-900 mb-2">Setup Instructions:</h3>
        <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
          <li>Go to <a href="https://whatstool.business" target="_blank" rel="noopener noreferrer" className="underline font-medium">Whatstool.business</a></li>
          <li>Connect your WhatsApp Business number</li>
          <li>Navigate to Developer API section</li>
          <li>Generate your API Key</li>
          <li>Copy your Channel Number (WhatsApp number)</li>
          <li>Enter credentials above and save</li>
        </ol>
        <div className="mt-3 p-3 bg-white rounded border border-green-300">
          <p className="text-xs font-semibold text-green-900 mb-1">API Endpoint Info:</p>
          <code className="text-xs text-green-700 block">
            POST https://developers.whatstool.business/v2/messages/&#123;channelNumber&#125;/&#123;customerNumber&#125;
          </code>
        </div>
      </div>
    </form>
  );
}
