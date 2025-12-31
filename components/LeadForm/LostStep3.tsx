'use client';

import { useState } from 'react';
import { LostStep3Data } from '@/lib/types';

interface LostStep3Props {
  initialData?: Partial<LostStep3Data>;
  onNext: (data: LostStep3Data) => void;
  onBack: () => void;
}

export default function LostStep3({ initialData, onNext, onBack }: LostStep3Props) {
  const [dealSize, setDealSize] = useState(
    initialData?.dealSize?.toString() || ''
  );
  const [modelName, setModelName] = useState(initialData?.modelName || '');
  const [errors, setErrors] = useState({ dealSize: '', modelName: '' });

  const validate = (): boolean => {
    const newErrors = { dealSize: '', modelName: '' };

    const amount = parseFloat(dealSize);
    if (!dealSize || isNaN(amount) || amount < 1) {
      newErrors.dealSize = 'Please enter a valid amount';
    }

    if (modelName.trim().length < 2) {
      newErrors.modelName = 'Model name must be at least 2 characters';
    }

    setErrors(newErrors);
    return !newErrors.dealSize && !newErrors.modelName;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext({
        dealSize: parseFloat(dealSize),
        modelName: modelName.trim(),
      });
    }
  };

  const formatCurrency = (value: string): string => {
    const num = value.replace(/[^\d]/g, '');
    if (!num) return '';
    return parseFloat(num).toLocaleString('en-IN');
  };

  const handleDealSizeChange = (value: string) => {
    const num = value.replace(/[^\d]/g, '');
    setDealSize(num);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-blue-600 hover:underline text-left"
      >
        ← Back
      </button>

      <div className="mb-2 text-sm text-gray-500">Step 3/4</div>
      <h2 className="text-2xl font-bold mb-6">Deal Details</h2>

      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-2">
          Final Quoted Price
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
            ₹
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={formatCurrency(dealSize)}
            onChange={(e) => handleDealSizeChange(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-300 pl-8 pr-4 py-4 text-base focus:border-blue-500 focus:outline-none"
            placeholder="0"
            autoFocus
          />
        </div>
        {errors.dealSize && (
          <p className="text-red-500 text-sm mt-1">{errors.dealSize}</p>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">
          Model Name
        </label>
        <input
          type="text"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          className="w-full rounded-lg border-2 border-gray-300 p-4 text-base focus:border-blue-500 focus:outline-none"
          placeholder="e.g., Hero Splendor Plus"
        />
        {errors.modelName && (
          <p className="text-red-500 text-sm mt-1">{errors.modelName}</p>
        )}
      </div>

      <button
        type="submit"
        className="mt-auto w-full bg-blue-600 text-white rounded-lg py-4 px-6 text-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors"
      >
        Next
      </button>
    </form>
  );
}
