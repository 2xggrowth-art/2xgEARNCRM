'use client';

import { useState } from 'react';
import { Step1Data } from '@/lib/types';

interface Step1Props {
  initialData?: Partial<Step1Data>;
  onNext: (data: Step1Data) => void;
}

export default function Step1({ initialData, onNext }: Step1Props) {
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [errors, setErrors] = useState({ name: '', phone: '' });

  const validate = (): boolean => {
    const newErrors = { name: '', phone: '' };

    if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      newErrors.phone = 'Phone must be exactly 10 digits';
    }

    setErrors(newErrors);
    return !newErrors.name && !newErrors.phone;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext({ name: name.trim(), phone });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full p-6">
      <div className="mb-2 text-sm text-gray-500">Step 1/4</div>
      <h2 className="text-2xl font-bold mb-6">Customer Details</h2>

      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-2">
          Customer Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border-2 border-gray-300 p-4 text-base focus:border-blue-500 focus:outline-none"
          placeholder="Enter customer name"
          autoFocus
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          className="w-full rounded-lg border-2 border-gray-300 p-4 text-base focus:border-blue-500 focus:outline-none"
          placeholder="10-digit mobile"
        />
        {errors.phone && (
          <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
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
