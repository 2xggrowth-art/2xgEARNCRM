'use client';

import { useState, useEffect } from 'react';
import { Step1Data, LeadStatus } from '@/lib/types';
import Link from 'next/link';

interface Step1Props {
  initialData?: Partial<Step1Data>;
  onNext: (data: Step1Data) => void;
}

interface ExistingCustomer {
  exists: boolean;
  leadCount: number;
  customerName: string;
}

export default function Step1({ initialData, onNext }: Step1Props) {
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [status, setStatus] = useState<LeadStatus>(initialData?.status || 'lost');
  const [errors, setErrors] = useState({ name: '', phone: '' });
  const [existingCustomer, setExistingCustomer] = useState<ExistingCustomer | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);

  // Check for duplicate phone number when phone changes
  useEffect(() => {
    const checkPhone = async () => {
      if (phone.length === 10) {
        setCheckingPhone(true);
        try {
          const user = localStorage.getItem('user');
          if (user) {
            const userData = JSON.parse(user);
            const orgId = userData.organization_id || userData.organizationId;

            if (!orgId) {
              console.error('No organization ID found in user data');
              return;
            }

            const response = await fetch(
              `/api/customers/check-phone?phone=${phone}&orgId=${orgId}`
            );
            const data = await response.json();

            if (data.success && data.data.exists) {
              setExistingCustomer({
                exists: true,
                leadCount: data.data.leadCount,
                customerName: data.data.customerName,
              });
            } else {
              setExistingCustomer(null);
            }
          }
        } catch (error) {
          console.error('Error checking phone:', error);
        } finally {
          setCheckingPhone(false);
        }
      } else {
        setExistingCustomer(null);
      }
    };

    const debounceTimer = setTimeout(checkPhone, 500);
    return () => clearTimeout(debounceTimer);
  }, [phone]);

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

  const handleStatusClick = (selectedStatus: LeadStatus) => {
    // Set the status first
    setStatus(selectedStatus);

    // Validate and proceed to next step
    if (validate()) {
      onNext({ name: name.trim(), phone, status: selectedStatus });
    }
  };

  const totalSteps = status === 'win' ? 3 : 4;

  return (
    <div className="flex flex-col h-full p-6">
      <div className="mb-2 text-sm text-gray-500">Step 1/{totalSteps}</div>
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

        {/* Show existing customer warning */}
        {existingCustomer && existingCustomer.exists && (
          <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Already exists - </span>
              <Link
                href={`/customer/${phone}`}
                className="text-blue-600 hover:underline font-semibold"
                target="_blank"
              >
                Lead ({existingCustomer.leadCount})
              </Link>
              {' '}for {existingCustomer.customerName}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              You can still create a new lead for this customer
            </p>
          </div>
        )}

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
        {checkingPhone && (
          <p className="text-gray-500 text-xs mt-1">Checking...</p>
        )}
        {errors.phone && (
          <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 font-semibold mb-3">
          Lead Status:
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleStatusClick('win')}
            className="py-4 px-6 rounded-lg text-lg font-semibold border-2 transition-all bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:border-green-500 active:bg-green-600 active:text-white"
          >
            ✓ WIN
          </button>
          <button
            type="button"
            onClick={() => handleStatusClick('lost')}
            className="py-4 px-6 rounded-lg text-lg font-semibold border-2 transition-all bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:border-red-500 active:bg-red-600 active:text-white"
          >
            ✗ LOST
          </button>
        </div>
      </div>
    </div>
  );
}
