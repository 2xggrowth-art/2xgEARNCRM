'use client';

import { useState } from 'react';
import { Step4Data, PurchaseTimeline, NotTodayReason } from '@/lib/types';

interface Step4Props {
  initialData?: Partial<Step4Data>;
  onSubmit: (data: Step4Data) => void;
  onBack: () => void;
  loading?: boolean;
}

const timelineOptions: { value: PurchaseTimeline; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '3_days', label: 'Within 3 Days' },
  { value: '7_days', label: 'Within 7 Days' },
  { value: '30_days', label: 'Within 30 Days' },
];

const reasonOptions: { value: NotTodayReason; label: string }[] = [
  { value: 'need_family_approval', label: 'Need to discuss with family' },
  { value: 'price_high', label: 'Price concern' },
  { value: 'want_more_options', label: 'Want to see more options' },
  { value: 'just_browsing', label: 'Just looking around' },
];

export default function Step4({
  initialData,
  onSubmit,
  onBack,
  loading = false,
}: Step4Props) {
  const [purchaseTimeline, setPurchaseTimeline] = useState<PurchaseTimeline>(
    initialData?.purchaseTimeline || 'today'
  );
  const [notTodayReason, setNotTodayReason] = useState<NotTodayReason | ''>(
    initialData?.notTodayReason || ''
  );
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (purchaseTimeline !== 'today' && !notTodayReason) {
      setError('Please select a reason');
      return;
    }

    onSubmit({
      purchaseTimeline,
      notTodayReason: purchaseTimeline !== 'today' ? (notTodayReason as NotTodayReason) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-blue-600 hover:underline text-left"
        disabled={loading}
      >
        ← Back
      </button>

      <div className="mb-2 text-sm text-gray-500">Step 4/4</div>
      <h2 className="text-2xl font-bold mb-6">Purchase Timeline</h2>

      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-3">
          When will the customer buy?
        </label>
        <div className="space-y-2">
          {timelineOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setPurchaseTimeline(option.value);
                if (option.value === 'today') {
                  setNotTodayReason('');
                }
              }}
              className={`w-full p-4 rounded-lg border-2 text-left font-medium transition-all ${
                purchaseTimeline === option.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {purchaseTimeline !== 'today' && (
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-3">
            Why not today?
          </label>
          <div className="space-y-2">
            {reasonOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setNotTodayReason(option.value)}
                className={`w-full p-4 rounded-lg border-2 text-left font-medium transition-all ${
                  notTodayReason === option.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-auto w-full bg-green-600 text-white rounded-lg py-4 px-6 text-lg font-semibold hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Submitting...
          </span>
        ) : (
          'Submit Lead'
        )}
      </button>
    </form>
  );
}
