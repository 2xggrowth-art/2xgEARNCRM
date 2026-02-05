'use client';

import { useState, useEffect } from 'react';
import { SpinPrize } from '@/lib/types';

interface OfferSettingsData {
  whatsappNumber: string;
  prizes: SpinPrize[];
  enabled: boolean;
}

// Predefined colors for prizes
const PRIZE_COLORS = [
  { color: '#FF6B6B', textColor: '#FFFFFF', name: 'Red' },
  { color: '#4ECDC4', textColor: '#FFFFFF', name: 'Teal' },
  { color: '#45B7D1', textColor: '#FFFFFF', name: 'Blue' },
  { color: '#96CEB4', textColor: '#FFFFFF', name: 'Green' },
  { color: '#FFEAA7', textColor: '#333333', name: 'Yellow' },
  { color: '#DFE6E9', textColor: '#333333', name: 'Gray' },
  { color: '#A29BFE', textColor: '#FFFFFF', name: 'Purple' },
  { color: '#FD79A8', textColor: '#FFFFFF', name: 'Pink' },
  { color: '#FDCB6E', textColor: '#333333', name: 'Orange' },
  { color: '#00B894', textColor: '#FFFFFF', name: 'Emerald' },
];

export default function OfferSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<OfferSettingsData>({
    whatsappNumber: '',
    prizes: [],
    enabled: true,
  });
  const [newPrize, setNewPrize] = useState({
    label: '',
    probability: 10,
    colorIndex: 0,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/offer-settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Error fetching offer settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch('/api/admin/offer-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappNumber: settings.whatsappNumber,
          prizes: settings.prizes,
          enabled: settings.enabled,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Offer settings saved successfully');
        setSettings(data.data);
      } else {
        alert(data.error || 'Failed to save settings');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  const addPrize = () => {
    if (!newPrize.label.trim()) {
      alert('Please enter a prize label');
      return;
    }

    const selectedColor = PRIZE_COLORS[newPrize.colorIndex];
    const probability = newPrize.probability / 100;

    const updatedPrizes = [
      ...settings.prizes,
      {
        label: newPrize.label.trim(),
        probability,
        color: selectedColor.color,
        textColor: selectedColor.textColor,
      },
    ];

    setSettings({ ...settings, prizes: updatedPrizes });
    setNewPrize({ label: '', probability: 10, colorIndex: (newPrize.colorIndex + 1) % PRIZE_COLORS.length });
  };

  const removePrize = (index: number) => {
    const updatedPrizes = settings.prizes.filter((_, i) => i !== index);
    setSettings({ ...settings, prizes: updatedPrizes });
  };

  const updatePrizeProbability = (index: number, probability: number) => {
    const updatedPrizes = settings.prizes.map((prize, i) =>
      i === index ? { ...prize, probability: probability / 100 } : prize
    );
    setSettings({ ...settings, prizes: updatedPrizes });
  };

  const togglePrizeEnabled = (index: number) => {
    const updatedPrizes = settings.prizes.map((prize, i) =>
      i === index ? { ...prize, disabled: !prize.disabled } : prize
    );
    setSettings({ ...settings, prizes: updatedPrizes });
  };

  const totalProbability = settings.prizes.reduce((sum, p) => sum + p.probability, 0);
  const probabilityValid = Math.abs(totalProbability - 1) < 0.01;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg px-6 py-3 mb-6 shadow-md">
        <h2 className="text-lg font-semibold text-white">QR Code Offer Settings</h2>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="mb-6 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Enable QR Offers</p>
          <p className="text-sm text-gray-500">Allow customers to scan QR codes and spin for prizes</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
        </label>
      </div>

      {/* WhatsApp Number */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">
          WhatsApp Notification Number
        </label>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 bg-gray-100 px-3 py-3 rounded-l-lg border-2 border-r-0 border-gray-300">
            +91
          </span>
          <input
            type="tel"
            value={settings.whatsappNumber.replace(/^91/, '')}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 10);
              setSettings({ ...settings, whatsappNumber: value ? `91${value}` : '' });
            }}
            className="flex-1 rounded-r-lg border-2 border-gray-300 p-3 focus:border-pink-500 focus:outline-none"
            placeholder="10-digit mobile number"
            maxLength={10}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          When customers win a prize and click "Share on WhatsApp", the message will be sent to this number
        </p>
      </div>

      {/* Prizes Configuration */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-3">
          Spin Wheel Prizes
        </label>

        {/* Add New Prize */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={newPrize.label}
              onChange={(e) => setNewPrize({ ...newPrize, label: e.target.value })}
              className="rounded-lg border-2 border-gray-300 p-2 focus:border-pink-500 focus:outline-none"
              placeholder="Prize label (e.g., 10% Off)"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={newPrize.probability}
                onChange={(e) => setNewPrize({ ...newPrize, probability: Math.max(1, Math.min(100, parseInt(e.target.value) || 0)) })}
                className="w-20 rounded-lg border-2 border-gray-300 p-2 focus:border-pink-500 focus:outline-none"
                min={1}
                max={100}
              />
              <span className="text-gray-500">%</span>
            </div>
            <select
              value={newPrize.colorIndex}
              onChange={(e) => setNewPrize({ ...newPrize, colorIndex: parseInt(e.target.value) })}
              className="rounded-lg border-2 border-gray-300 p-2 focus:border-pink-500 focus:outline-none"
            >
              {PRIZE_COLORS.map((c, i) => (
                <option key={i} value={i}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={addPrize}
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 px-4 font-medium transition-colors"
            >
              + Add Prize
            </button>
          </div>
        </div>

        {/* Prize List */}
        <div className="space-y-2">
          {settings.prizes.map((prize, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
                prize.disabled
                  ? 'border-gray-200 bg-gray-50 opacity-60'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: prize.color }}
              />
              <span className={`flex-1 font-medium ${prize.disabled ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                {prize.label}
              </span>

              {/* Enable/Disable Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">
                  {prize.disabled ? 'Disabled' : 'Enabled'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!prize.disabled}
                    onChange={() => togglePrizeEnabled(index)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={Math.round(prize.probability * 100)}
                  onChange={(e) => updatePrizeProbability(index, parseInt(e.target.value) || 0)}
                  className="w-16 rounded border border-gray-300 p-1 text-center text-sm"
                  min={1}
                  max={100}
                />
                <span className="text-gray-500 text-sm">%</span>
              </div>
              <button
                onClick={() => removePrize(index)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {settings.prizes.length === 0 && (
          <p className="text-gray-500 text-center py-4">No prizes configured. Add at least one prize.</p>
        )}

        {/* Probability Indicator */}
        {settings.prizes.length > 0 && (
          <div className={`mt-3 p-3 rounded-lg ${probabilityValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <div className="flex items-center gap-2">
              {probabilityValid ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">
                Total: {(totalProbability * 100).toFixed(0)}%
                {!probabilityValid && ' - Must equal 100%'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || (settings.prizes.length > 0 && !probabilityValid)}
        className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-lg py-3 px-6 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {saving ? 'Saving...' : 'Save Offer Settings'}
      </button>
    </div>
  );
}
