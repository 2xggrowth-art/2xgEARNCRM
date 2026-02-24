'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Commission rate per product category (from DB)
interface CategoryRate {
  id: string;
  category_name: string;
  commission_percentage: number;
  multiplier: number;
  min_sale_price: number;
  premium_threshold: number;
  is_active: boolean;
}

// Config shape matching the DB/API
interface Config {
  streak_bonus_7_days: number;
  streak_bonus_14_days: number;
  streak_bonus_30_days: number;
  review_bonus_per_review: number;
  default_monthly_target: number;
  salary_cap_enabled: boolean;
  penalty_late_arrival: number;
  penalty_unauthorized_absence: number;
  penalty_back_to_back_offs: number;
  penalty_low_compliance: number;
  penalty_high_error_rate: number;
  penalty_non_escalated_lost_lead: number;
  penalty_missing_documentation: number;
  penalty_low_team_eval: number;
  penalty_client_disrespect: number;
  compliance_threshold: number;
  error_rate_threshold: number;
  team_eval_threshold: number;
  team_pool_top_performer: number;
  team_pool_second_performer: number;
  team_pool_third_performer: number;
  team_pool_manager: number;
  team_pool_support_staff: number;
  team_pool_others: number;
}

// Default config fallback
const DEFAULT_CONFIG: Config = {
  streak_bonus_7_days: 50,
  streak_bonus_14_days: 150,
  streak_bonus_30_days: 700,
  review_bonus_per_review: 10,
  default_monthly_target: 1000000,
  salary_cap_enabled: true,
  penalty_late_arrival: 5,
  penalty_unauthorized_absence: 10,
  penalty_back_to_back_offs: 10,
  penalty_low_compliance: 10,
  penalty_high_error_rate: 10,
  penalty_non_escalated_lost_lead: 10,
  penalty_missing_documentation: 10,
  penalty_low_team_eval: 15,
  penalty_client_disrespect: 100,
  compliance_threshold: 96,
  error_rate_threshold: 1,
  team_eval_threshold: 4.0,
  team_pool_top_performer: 20,
  team_pool_second_performer: 12,
  team_pool_third_performer: 8,
  team_pool_manager: 20,
  team_pool_support_staff: 20,
  team_pool_others: 20,
};

// Penalty type labels for display
const PENALTY_LABELS: Record<string, { label: string; description: string }> = {
  penalty_late_arrival: { label: 'Late Arrival', description: 'Per instance' },
  penalty_unauthorized_absence: { label: 'Unauthorized Absence', description: 'Per day' },
  penalty_back_to_back_offs: { label: 'Back-to-Back Offs', description: 'Per violation' },
  penalty_low_compliance: { label: 'Low Compliance', description: 'Per point below threshold' },
  penalty_high_error_rate: { label: 'High Error Rate', description: 'Per point above threshold' },
  penalty_non_escalated_lost_lead: { label: 'Non-Escalated Lost Lead', description: 'Per lead' },
  penalty_missing_documentation: { label: 'Missing Documentation', description: 'Per item' },
  penalty_low_team_eval: { label: 'Low Team Evaluation', description: 'Per point below threshold' },
  penalty_client_disrespect: { label: 'Client Disrespect', description: 'NUCLEAR - full forfeiture' },
};

export default function IncentiveConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [categories, setCategories] = useState<CategoryRate[]>([]);
  const [savedMessage, setSavedMessage] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Check auth from localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    setUserRole(parsed.role || '');

    // Only manager+ can access
    if (!['super_admin', 'manager'].includes(parsed.role)) {
      router.push('/');
      return;
    }

    // Fetch config and categories
    Promise.all([fetchConfig(), fetchCategories()]).then(() => setLoading(false));
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/earn/incentive-config');
      const data = await response.json();
      if (data.success && data.data) {
        const d = data.data;
        setConfig({
          streak_bonus_7_days: Number(d.streak_bonus_7_days) || DEFAULT_CONFIG.streak_bonus_7_days,
          streak_bonus_14_days: Number(d.streak_bonus_14_days) || DEFAULT_CONFIG.streak_bonus_14_days,
          streak_bonus_30_days: Number(d.streak_bonus_30_days) || DEFAULT_CONFIG.streak_bonus_30_days,
          review_bonus_per_review: Number(d.review_bonus_per_review) || DEFAULT_CONFIG.review_bonus_per_review,
          default_monthly_target: Number(d.default_monthly_target) || DEFAULT_CONFIG.default_monthly_target,
          salary_cap_enabled: d.salary_cap_enabled ?? DEFAULT_CONFIG.salary_cap_enabled,
          penalty_late_arrival: Number(d.penalty_late_arrival) || DEFAULT_CONFIG.penalty_late_arrival,
          penalty_unauthorized_absence: Number(d.penalty_unauthorized_absence) || DEFAULT_CONFIG.penalty_unauthorized_absence,
          penalty_back_to_back_offs: Number(d.penalty_back_to_back_offs) || DEFAULT_CONFIG.penalty_back_to_back_offs,
          penalty_low_compliance: Number(d.penalty_low_compliance) || DEFAULT_CONFIG.penalty_low_compliance,
          penalty_high_error_rate: Number(d.penalty_high_error_rate) || DEFAULT_CONFIG.penalty_high_error_rate,
          penalty_non_escalated_lost_lead: Number(d.penalty_non_escalated_lost_lead) || DEFAULT_CONFIG.penalty_non_escalated_lost_lead,
          penalty_missing_documentation: Number(d.penalty_missing_documentation) || DEFAULT_CONFIG.penalty_missing_documentation,
          penalty_low_team_eval: Number(d.penalty_low_team_eval) || DEFAULT_CONFIG.penalty_low_team_eval,
          penalty_client_disrespect: Number(d.penalty_client_disrespect) || DEFAULT_CONFIG.penalty_client_disrespect,
          compliance_threshold: Number(d.compliance_threshold) || DEFAULT_CONFIG.compliance_threshold,
          error_rate_threshold: Number(d.error_rate_threshold) || DEFAULT_CONFIG.error_rate_threshold,
          team_eval_threshold: Number(d.team_eval_threshold) || DEFAULT_CONFIG.team_eval_threshold,
          team_pool_top_performer: Number(d.team_pool_top_performer) || DEFAULT_CONFIG.team_pool_top_performer,
          team_pool_second_performer: Number(d.team_pool_second_performer) || DEFAULT_CONFIG.team_pool_second_performer,
          team_pool_third_performer: Number(d.team_pool_third_performer) || DEFAULT_CONFIG.team_pool_third_performer,
          team_pool_manager: Number(d.team_pool_manager) || DEFAULT_CONFIG.team_pool_manager,
          team_pool_support_staff: Number(d.team_pool_support_staff) || DEFAULT_CONFIG.team_pool_support_staff,
          team_pool_others: Number(d.team_pool_others) || DEFAULT_CONFIG.team_pool_others,
        });
      }
    } catch {
      // Use defaults
    }
  };

  const fetchCategories = async () => {
    try {
      // Fetch commission rates which include category info
      const response = await fetch('/api/earn/commission-rates');
      const data = await response.json();
      if (data.success && data.data) {
        setCategories(
          data.data.map((r: any) => ({
            id: r.id,
            category_name: r.category_name || 'Unknown',
            commission_percentage: Number(r.commission_percentage) || 0.8,
            multiplier: Number(r.multiplier) || 1.0,
            min_sale_price: Number(r.min_sale_price) || 0,
            premium_threshold: Number(r.premium_threshold) || 50000,
            is_active: r.is_active ?? true,
          }))
        );
      }
    } catch {
      // No commission rates configured yet
    }
  };

  const updateField = (field: keyof Config, value: number | boolean) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateCategory = (id: string, field: keyof CategoryRate, value: number | boolean | string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, [field]: value } : cat))
    );
  };

  const teamPoolSum =
    config.team_pool_top_performer +
    config.team_pool_second_performer +
    config.team_pool_third_performer +
    config.team_pool_manager +
    config.team_pool_support_staff +
    config.team_pool_others;

  const isPoolValid = Math.abs(teamPoolSum - 100) < 0.01;

  const handleSave = async () => {
    if (!isPoolValid) {
      alert('Team Pool percentages must add up to 100%');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/earn/incentive-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (data.success) {
        setSavedMessage('Configuration saved successfully!');
        setTimeout(() => setSavedMessage(''), 3000);
      } else {
        alert(data.error || 'Failed to save configuration');
      }
    } catch {
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCommissionRate = async (cat: CategoryRate) => {
    setSavingRates(true);
    try {
      const response = await fetch('/api/earn/commission-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cat.id,
          commission_percentage: cat.commission_percentage,
          multiplier: cat.multiplier,
          min_sale_price: cat.min_sale_price,
          premium_threshold: cat.premium_threshold,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSavedMessage('Commission rate updated!');
        setTimeout(() => setSavedMessage(''), 3000);
      } else {
        alert(data.error || 'Failed to save commission rate');
      }
    } catch {
      alert('Failed to save commission rate');
    } finally {
      setSavingRates(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Incentive Configuration</h1>
            <p className="text-xs text-gray-500">Configure commission, bonuses & penalties</p>
          </div>
          <button
            onClick={() => router.push('/manager/incentives')}
            className="px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Manage
          </button>
        </div>
      </div>

      {/* Success Message */}
      {savedMessage && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {savedMessage}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ========== SECTION 0: COMMISSION RATES BY CATEGORY ========== */}
        {categories.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
                Commission Rates by Category
              </h2>
              <p className="text-emerald-100 text-xs mt-1">Set commission % for each product category your reps sell</p>
            </div>
            <div className="p-6 space-y-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`rounded-lg border-2 transition-all ${
                    editingCategory === cat.id
                      ? 'border-emerald-400 bg-emerald-50/50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <button
                    onClick={() => setEditingCategory(editingCategory === cat.id ? null : cat.id)}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-100">
                        <span className="text-lg font-bold text-emerald-600">{cat.category_name.charAt(0)}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-800">{cat.category_name}</p>
                        <p className="text-xs text-gray-500">
                          Min: {formatCurrency(cat.min_sale_price)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{cat.commission_percentage}%</p>
                        {cat.multiplier > 1 && (
                          <p className="text-xs text-amber-600 font-medium">x{cat.multiplier} premium</p>
                        )}
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 text-gray-400 transition-transform ${
                          editingCategory === cat.id ? 'rotate-180' : ''
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>

                  {editingCategory === cat.id && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Commission Rate</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={cat.commission_percentage}
                              onChange={(e) => updateCategory(cat.id, 'commission_percentage', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border-2 border-gray-300 p-2.5 pr-8 font-semibold text-sm focus:border-emerald-500 focus:outline-none"
                              min={0}
                              max={100}
                              step={0.1}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Premium Multiplier</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={cat.multiplier}
                              onChange={(e) => updateCategory(cat.id, 'multiplier', parseFloat(e.target.value) || 1)}
                              className="w-full rounded-lg border-2 border-gray-300 p-2.5 pr-8 font-semibold text-sm focus:border-emerald-500 focus:outline-none"
                              min={1}
                              max={10}
                              step={0.1}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">x</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Min Sale Price</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">&#8377;</span>
                            <input
                              type="number"
                              value={cat.min_sale_price}
                              onChange={(e) => updateCategory(cat.id, 'min_sale_price', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border-2 border-gray-300 p-2.5 pl-7 font-semibold text-sm focus:border-emerald-500 focus:outline-none"
                              min={0}
                              step={500}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Premium Threshold</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">&#8377;</span>
                            <input
                              type="number"
                              value={cat.premium_threshold}
                              onChange={(e) => updateCategory(cat.id, 'premium_threshold', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border-2 border-gray-300 p-2.5 pl-7 font-semibold text-sm focus:border-emerald-500 focus:outline-none"
                              min={0}
                              step={5000}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                        <p className="font-medium text-gray-700 mb-1">How it works:</p>
                        <p>Sale below {formatCurrency(cat.premium_threshold)} &rarr; <span className="font-bold text-emerald-600">{cat.commission_percentage}%</span> commission</p>
                        {cat.multiplier > 1 && (
                          <p>Sale at/above {formatCurrency(cat.premium_threshold)} &rarr; <span className="font-bold text-amber-600">{cat.commission_percentage}% x {cat.multiplier} = {(cat.commission_percentage * cat.multiplier).toFixed(2)}%</span> commission</p>
                        )}
                        <p className="mt-1 text-gray-400">Sales below {formatCurrency(cat.min_sale_price)} do not qualify</p>
                      </div>

                      <button
                        onClick={() => handleSaveCommissionRate(cat)}
                        disabled={savingRates}
                        className="mt-3 w-full py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 disabled:bg-gray-300 transition-colors"
                      >
                        {savingRates ? 'Saving...' : 'Save Rate'}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Summary Table */}
              <div className="mt-4 bg-emerald-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-emerald-800 mb-2">Quick Summary</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {categories.slice(0, 6).map((cat) => (
                    <div key={cat.id} className="bg-white rounded-lg p-2 shadow-sm">
                      <p className="text-xs text-gray-500 truncate">{cat.category_name}</p>
                      <p className="text-lg font-bold text-emerald-600">{cat.commission_percentage}%</p>
                      {cat.multiplier > 1 && (
                        <p className="text-[10px] text-amber-600">x{cat.multiplier} over {formatCurrency(cat.premium_threshold)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== SECTION 1: STREAK BONUSES ========== */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              Streak Bonuses
            </h2>
            <p className="text-orange-100 text-xs mt-1">Daily engagement rewards (cumulative)</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <NumberInput
                label="7-Day Streak"
                value={config.streak_bonus_7_days}
                onChange={(v) => updateField('streak_bonus_7_days', v)}
                prefix="&#8377;"
                hint="Bonus at 7 days"
              />
              <NumberInput
                label="14-Day Streak"
                value={config.streak_bonus_14_days}
                onChange={(v) => updateField('streak_bonus_14_days', v)}
                prefix="&#8377;"
                hint="Cumulative at 14 days"
              />
              <NumberInput
                label="30-Day Streak"
                value={config.streak_bonus_30_days}
                onChange={(v) => updateField('streak_bonus_30_days', v)}
                prefix="&#8377;"
                hint="Cumulative at 30 days"
              />
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
              Requires minimum 1 review or 1 lead log per day. 1 free miss day per week allowed.
            </div>
          </div>
        </div>

        {/* ========== SECTION 2: REVIEW & TARGET SETTINGS ========== */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Review & Target Settings
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberInput
                label="Bonus Per Google Review"
                value={config.review_bonus_per_review}
                onChange={(v) => updateField('review_bonus_per_review', v)}
                prefix="&#8377;"
                hint="Credited when customer submits review"
              />
              <NumberInput
                label="Default Monthly Target"
                value={config.default_monthly_target}
                onChange={(v) => updateField('default_monthly_target', v)}
                prefix="&#8377;"
                hint={`Currently: ${formatCurrency(config.default_monthly_target)}`}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="font-semibold text-gray-800">Salary Cap Protection</p>
                <p className="text-xs text-gray-500 mt-1">
                  Cap incentive at employee&apos;s monthly salary. If exceeded, flag for management review.
                </p>
              </div>
              <button
                onClick={() => updateField('salary_cap_enabled', !config.salary_cap_enabled)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  config.salary_cap_enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    config.salary_cap_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ========== SECTION 3: PENALTY RATES ========== */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Penalty Rates
            </h2>
            <p className="text-red-100 text-xs mt-1">Deduction percentages applied to base incentive</p>
          </div>
          <div className="p-6 space-y-3">
            {Object.entries(PENALTY_LABELS).map(([key, { label, description }]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-medium text-gray-800 text-sm">{label}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    value={config[key as keyof Config] as number}
                    onChange={(e) => updateField(key as keyof Config, parseFloat(e.target.value) || 0)}
                    className="w-20 text-right rounded-lg border-2 border-gray-300 p-2 text-sm font-semibold focus:border-red-400 focus:outline-none"
                    min="0"
                    max="100"
                    step="1"
                  />
                  <span className="text-gray-500 text-sm font-medium">%</span>
                </div>
              </div>
            ))}
            <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700">
              Client Disrespect = 100% means full incentive forfeiture (zero tolerance).
              Maximum penalty cap for compliance, errors, and documentation is 50%.
            </div>
          </div>
        </div>

        {/* ========== SECTION 4: PENALTY THRESHOLDS ========== */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-violet-500 px-6 py-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Penalty Thresholds
            </h2>
            <p className="text-purple-100 text-xs mt-1">Minimum standards before penalties apply</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <NumberInput
                label="Compliance Target"
                value={config.compliance_threshold}
                onChange={(v) => updateField('compliance_threshold', v)}
                suffix="%"
                hint="Penalty below this score"
                step={1}
              />
              <NumberInput
                label="Error Rate Limit"
                value={config.error_rate_threshold}
                onChange={(v) => updateField('error_rate_threshold', v)}
                suffix="%"
                hint="Penalty above this rate"
                step={0.5}
              />
              <NumberInput
                label="Team Eval Target"
                value={config.team_eval_threshold}
                onChange={(v) => updateField('team_eval_threshold', v)}
                suffix="/ 5.0"
                hint="Penalty below this score"
                step={0.1}
                max={5}
              />
            </div>
          </div>
        </div>

        {/* ========== SECTION 5: TEAM POOL DISTRIBUTION ========== */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                Team Pool Distribution
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  isPoolValid
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800 animate-pulse'
                }`}
              >
                {teamPoolSum.toFixed(1)}%
              </span>
            </div>
            <p className="text-green-100 text-xs mt-1">Monthly pool split among team members (must total 100%)</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <PoolInput
                label="Top Performer (#1)"
                value={config.team_pool_top_performer}
                onChange={(v) => updateField('team_pool_top_performer', v)}
                color="yellow"
              />
              <PoolInput
                label="2nd Place"
                value={config.team_pool_second_performer}
                onChange={(v) => updateField('team_pool_second_performer', v)}
                color="gray"
              />
              <PoolInput
                label="3rd Place"
                value={config.team_pool_third_performer}
                onChange={(v) => updateField('team_pool_third_performer', v)}
                color="orange"
              />
              <PoolInput
                label="Manager"
                value={config.team_pool_manager}
                onChange={(v) => updateField('team_pool_manager', v)}
                color="blue"
              />
              <PoolInput
                label="Support Staff"
                value={config.team_pool_support_staff}
                onChange={(v) => updateField('team_pool_support_staff', v)}
                color="purple"
              />
              <PoolInput
                label="Other Sales"
                value={config.team_pool_others}
                onChange={(v) => updateField('team_pool_others', v)}
                color="green"
              />
            </div>

            <div className="mt-4">
              <div className="flex rounded-full overflow-hidden h-4">
                <div className="bg-yellow-400" style={{ width: `${config.team_pool_top_performer}%` }} title="Top Performer" />
                <div className="bg-gray-400" style={{ width: `${config.team_pool_second_performer}%` }} title="2nd Place" />
                <div className="bg-orange-400" style={{ width: `${config.team_pool_third_performer}%` }} title="3rd Place" />
                <div className="bg-blue-400" style={{ width: `${config.team_pool_manager}%` }} title="Manager" />
                <div className="bg-purple-400" style={{ width: `${config.team_pool_support_staff}%` }} title="Support" />
                <div className="bg-green-400" style={{ width: `${config.team_pool_others}%` }} title="Others" />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {!isPoolValid && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                Total must equal 100%. Currently: {teamPoolSum.toFixed(1)}% (off by {(teamPoolSum - 100).toFixed(1)}%)
              </div>
            )}
          </div>
        </div>

        {/* ========== FORMULA PREVIEW ========== */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
              </svg>
              Calculation Formula Preview
            </h2>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-700 space-y-1">
              <p className="text-gray-400">// Step 1: Check minimum target</p>
              <p>if (monthly_revenue &lt; <span className="text-blue-600 font-bold">{formatCurrency(config.default_monthly_target)}</span>) &rarr; incentive = 0</p>
              <p className="mt-2 text-gray-400">// Step 2: Calculate base commission</p>
              <p>gross = sum(sale_commissions) <span className="text-gray-400">// from commission rates table</span></p>
              <p className="mt-2 text-gray-400">// Step 3: Add bonuses</p>
              <p>gross += streak_bonus <span className="text-gray-400">// {formatCurrency(config.streak_bonus_7_days)} / {formatCurrency(config.streak_bonus_14_days)} / {formatCurrency(config.streak_bonus_30_days)}</span></p>
              <p>gross += reviews x <span className="text-blue-600 font-bold">{formatCurrency(config.review_bonus_per_review)}</span></p>
              <p className="mt-2 text-gray-400">// Step 4: Apply penalties</p>
              <p>net = gross - (gross x total_penalty_%)</p>
              {config.salary_cap_enabled && (
                <>
                  <p className="mt-2 text-gray-400">// Step 5: Salary cap</p>
                  <p>final = min(net, monthly_salary) <span className="text-green-600">&#10003; enabled</span></p>
                </>
              )}
              <p className="mt-2 text-gray-400">// Step 6: Add team pool share</p>
              <p>payout = final + team_pool_share</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saving || !isPoolValid}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white text-lg transition-all ${
              saving || !isPoolValid
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-md'
            }`}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </span>
            ) : (
              'Save Configuration'
            )}
          </button>
          {!isPoolValid && (
            <p className="text-center text-red-500 text-xs mt-2">
              Fix Team Pool total ({teamPoolSum.toFixed(1)}%) before saving
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== REUSABLE COMPONENTS ==========

function NumberInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  step = 1,
  min = 0,
  max = 99999999,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`w-full rounded-lg border-2 border-gray-300 p-3 font-semibold focus:border-blue-500 focus:outline-none ${
            prefix ? 'pl-8' : ''
          } ${suffix ? 'pr-12' : ''}`}
          min={min}
          max={max}
          step={step}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function PoolInput({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const dotColors: Record<string, string> = {
    yellow: 'bg-yellow-400',
    gray: 'bg-gray-400',
    orange: 'bg-orange-400',
    blue: 'bg-blue-400',
    purple: 'bg-purple-400',
    green: 'bg-green-400',
  };

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
        <span className={`w-3 h-3 rounded-full ${dotColors[color] || 'bg-gray-400'}`} />
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded-lg border-2 border-gray-300 p-3 pr-8 font-semibold focus:border-green-500 focus:outline-none"
          min={0}
          max={100}
          step={1}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
          %
        </span>
      </div>
    </div>
  );
}
