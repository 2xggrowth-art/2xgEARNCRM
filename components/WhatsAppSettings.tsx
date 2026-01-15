'use client';

import { useState, useEffect } from 'react';
import { saveWhatsAppCredentials, getWhatsAppStatus } from '@/app/actions/whatsapp';
import { WhatsAppProvider } from '@/lib/types';
import MetaWhatsAppConfig from './whatsapp-providers/MetaWhatsAppConfig';
import WhatstoolConfig from './whatsapp-providers/WhatstoolConfig';

export default function WhatsAppSettings() {
  const [provider, setProvider] = useState<WhatsAppProvider>('meta');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
        setProvider(status.provider || 'meta');
        setIsActive(status.isActive !== false);
      }
    } catch (error) {
      console.error('Error loading WhatsApp config:', error);
    } finally {
      setLoading(false);
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
        <h2 className="text-lg font-semibold text-white">WhatsApp Integration Settings</h2>
      </div>

      {configured && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">WhatsApp is configured and {isActive ? 'active' : 'inactive'}</span>
          </div>
        </div>
      )}

      {/* Provider Selection */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-3">
          Select WhatsApp Provider
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Meta Cloud API */}
          <button
            type="button"
            onClick={() => setProvider('meta')}
            className={`p-4 border-2 rounded-lg transition-all ${
              provider === 'meta'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-300'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              <div className="font-semibold text-gray-900">Meta Cloud API</div>
              <div className="text-xs text-gray-500 mt-1">Official WhatsApp Business API</div>
            </div>
          </button>

          {/* Whatstool.business */}
          <button
            type="button"
            onClick={() => setProvider('whatstool')}
            className={`p-4 border-2 rounded-lg transition-all ${
              provider === 'whatstool'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-green-300'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <svg className="w-12 h-12 mb-2 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <div className="font-semibold text-gray-900">Whatstool.business</div>
              <div className="text-xs text-gray-500 mt-1">Third-party WhatsApp API</div>
            </div>
          </button>

          {/* Other */}
          <button
            type="button"
            onClick={() => setProvider('other')}
            className={`p-4 border-2 rounded-lg transition-all ${
              provider === 'other'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300 hover:border-purple-300'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <svg className="w-12 h-12 mb-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <div className="font-semibold text-gray-900">Other Provider</div>
              <div className="text-xs text-gray-500 mt-1">Custom configuration</div>
            </div>
          </button>
        </div>
      </div>

      {/* Provider-Specific Configuration */}
      {provider === 'meta' && (
        <MetaWhatsAppConfig
          isActive={isActive}
          onActiveChange={setIsActive}
          configured={configured}
          onConfigured={setConfigured}
        />
      )}

      {provider === 'whatstool' && (
        <WhatstoolConfig
          isActive={isActive}
          onActiveChange={setIsActive}
          configured={configured}
          onConfigured={setConfigured}
        />
      )}

      {provider === 'other' && (
        <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg text-center">
          <svg className="w-16 h-16 mx-auto mb-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="font-semibold text-purple-900 mb-2">Custom Provider Configuration</h3>
          <p className="text-purple-700 text-sm mb-4">
            For custom WhatsApp providers, please contact support to set up your integration.
          </p>
          <a
            href="mailto:support@2xg.in"
            className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Contact Support
          </a>
        </div>
      )}
    </div>
  );
}
