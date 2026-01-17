'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BENGALURU_LOCALITIES } from '@/lib/types';

function OffersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const salesRepId = searchParams.get('rep');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    locality: '',
    address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLocalityDropdown, setShowLocalityDropdown] = useState(false);
  const [filteredLocalities, setFilteredLocalities] = useState<string[]>([...BENGALURU_LOCALITIES]);

  useEffect(() => {
    if (!salesRepId) {
      // Invalid link - no sales rep ID
      router.push('/');
    }
  }, [salesRepId, router]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Please enter your name (at least 2 characters)';
    }

    if (!formData.phone || !/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    if (!formData.locality.trim()) {
      newErrors.locality = 'Please select your locality';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (value: string) => {
    // Only allow digits and limit to 10
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone: digits });
    if (errors.phone) {
      setErrors({ ...errors, phone: '' });
    }
  };

  const handleLocalityChange = (value: string) => {
    setFormData({ ...formData, locality: value });
    const filtered = BENGALURU_LOCALITIES.filter(loc =>
      loc.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredLocalities(filtered);
    setShowLocalityDropdown(true);
    if (errors.locality) {
      setErrors({ ...errors, locality: '' });
    }
  };

  const selectLocality = (locality: string) => {
    setFormData({ ...formData, locality });
    setShowLocalityDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/offers/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone,
          locality: formData.locality.trim(),
          address: formData.address.trim() || null,
          salesRepId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Check if already played
        if (data.data.alreadyPlayed) {
          // Redirect to results page with existing prize
          router.push(`/offers/spin?id=${data.data.id}&rep=${salesRepId}&played=true`);
        } else {
          // Navigate to spin wheel
          router.push(`/offers/spin?id=${data.data.id}&rep=${salesRepId}`);
        }
      } else {
        setErrors({ submit: data.error || 'Something went wrong. Please try again.' });
      }
    } catch (error) {
      console.error('Submission error:', error);
      setErrors({ submit: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!salesRepId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎁</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Unlock Exclusive Offers!
          </h1>
          <p className="text-white/90 text-lg">
            Enter your details to spin the wheel and win amazing prizes
          </p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Your Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                placeholder="Enter your name"
                className={`w-full px-4 py-3 border-2 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.name
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-gray-200 focus:border-purple-500 focus:ring-purple-200'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Mobile Number *
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 py-3 bg-gray-100 border-2 border-r-0 border-gray-200 rounded-l-lg text-gray-600 font-medium">
                  +91
                </span>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="10-digit mobile number"
                  className={`flex-1 px-4 py-3 border-2 rounded-r-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.phone
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-gray-200 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* Locality Field */}
            <div className="relative">
              <label className="block text-gray-700 font-semibold mb-2">
                Locality *
              </label>
              <input
                type="text"
                value={formData.locality}
                onChange={(e) => handleLocalityChange(e.target.value)}
                onFocus={() => setShowLocalityDropdown(true)}
                placeholder="Select or type your locality"
                className={`w-full px-4 py-3 border-2 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.locality
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-gray-200 focus:border-purple-500 focus:ring-purple-200'
                }`}
              />
              {showLocalityDropdown && filteredLocalities.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredLocalities.map((locality) => (
                    <button
                      key={locality}
                      type="button"
                      onClick={() => selectLocality(locality)}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                    >
                      {locality}
                    </button>
                  ))}
                </div>
              )}
              {errors.locality && (
                <p className="mt-1 text-sm text-red-500">{errors.locality}</p>
              )}
            </div>

            {/* Address Field (Optional) */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Address <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter your full address"
                rows={2}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-purple-500 focus:ring-purple-200 transition-all resize-none"
              />
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all transform ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-[1.02] active:scale-[0.98]'
              } text-white shadow-lg`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                'SPIN THE WHEEL!'
              )}
            </button>
          </form>

          {/* Trust badges */}
          <div className="mt-6 flex items-center justify-center space-x-4 text-gray-400 text-xs">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Secure
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              100% Free
            </span>
          </div>
        </div>

        {/* Click outside to close dropdown */}
        {showLocalityDropdown && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setShowLocalityDropdown(false)}
          />
        )}
      </div>
    </div>
  );
}

export default function OffersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <OffersContent />
    </Suspense>
  );
}
