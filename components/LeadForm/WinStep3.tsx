'use client';

import { useState, useEffect } from 'react';
import { WinStep3Data } from '@/lib/types';

interface WinStep3Props {
  initialData?: Partial<WinStep3Data>;
  onNext: (data: WinStep3Data) => void;
  onBack: () => void;
}

export default function WinStep3({ initialData, onNext, onBack }: WinStep3Props) {
  const [invoiceNo, setInvoiceNo] = useState(initialData?.invoiceNo || '');
  const [salePrice, setSalePrice] = useState<string>(
    initialData?.salePrice?.toString() || ''
  );
  const [errors, setErrors] = useState({ invoiceNo: '', salePrice: '' });
  const [checkingInvoice, setCheckingInvoice] = useState(false);

  const MIN_PRICE = 500;
  const MAX_PRICE = 500000;

  const checkInvoiceUniqueness = async (invoice: string) => {
    if (invoice.length < 3) return;

    setCheckingInvoice(true);
    try {
      const response = await fetch('/api/leads/check-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ invoiceNo: invoice }),
      });

      const data = await response.json();
      if (data.exists) {
        setErrors(prev => ({
          ...prev,
          invoiceNo: 'Invoice number already exists'
        }));
      } else {
        setErrors(prev => ({ ...prev, invoiceNo: '' }));
      }
    } catch (error) {
      console.error('Error checking invoice:', error);
    } finally {
      setCheckingInvoice(false);
    }
  };

  const validate = (): boolean => {
    const newErrors = { invoiceNo: '', salePrice: '' };

    if (invoiceNo.trim().length < 3) {
      newErrors.invoiceNo = 'Invoice number must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9]+$/.test(invoiceNo.trim())) {
      newErrors.invoiceNo = 'Invoice number must be alphanumeric';
    }

    const price = parseFloat(salePrice);
    if (!salePrice || isNaN(price)) {
      newErrors.salePrice = 'Sale price is required';
    } else if (price < MIN_PRICE) {
      newErrors.salePrice = `Sale price must be at least ₹${MIN_PRICE.toLocaleString()}`;
    } else if (price > MAX_PRICE) {
      newErrors.salePrice = `Sale price cannot exceed ₹${MAX_PRICE.toLocaleString()}`;
    }

    setErrors(newErrors);
    return !newErrors.invoiceNo && !newErrors.salePrice;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext({
        invoiceNo: invoiceNo.trim(),
        salePrice: parseFloat(salePrice),
      });
    }
  };

  const handlePriceChange = (value: string) => {
    // Allow only numbers and one decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) return;

    setSalePrice(cleanValue);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full p-6">
      <div className="mb-2 text-sm text-gray-500">Step 3/3</div>
      <h2 className="text-2xl font-bold mb-2">Sale Completed! 🎉</h2>
      <p className="text-gray-600 mb-6">Enter invoice and sale details</p>

      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-2">
          Invoice Number
        </label>
        <input
          type="text"
          value={invoiceNo}
          onChange={(e) => setInvoiceNo(e.target.value)}
          onBlur={() => checkInvoiceUniqueness(invoiceNo.trim())}
          className="w-full rounded-lg border-2 border-gray-300 p-4 text-base focus:border-green-500 focus:outline-none"
          placeholder="Enter invoice number"
          autoFocus
        />
        {checkingInvoice && (
          <p className="text-blue-500 text-sm mt-1">Checking availability...</p>
        )}
        {errors.invoiceNo && (
          <p className="text-red-500 text-sm mt-1">{errors.invoiceNo}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">
          Alphanumeric only (e.g., BH001, INV123)
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">
          Sale Price
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">
            ₹
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={salePrice}
            onChange={(e) => handlePriceChange(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-300 p-4 pl-10 text-base focus:border-green-500 focus:outline-none"
            placeholder="0"
          />
        </div>
        {errors.salePrice && (
          <p className="text-red-500 text-sm mt-1">{errors.salePrice}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">
          Min: ₹{MIN_PRICE.toLocaleString()} | Max: ₹{MAX_PRICE.toLocaleString()}
        </p>
      </div>

      <div className="mt-auto flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 rounded-lg py-4 px-6 text-lg font-semibold hover:bg-gray-300 active:bg-gray-400 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={checkingInvoice}
          className="flex-[2] bg-green-600 text-white rounded-lg py-4 px-6 text-lg font-semibold hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Complete Sale
        </button>
      </div>
    </form>
  );
}
