'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'phone' | 'otp' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOTP] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresOrgSetup, setRequiresOrgSetup] = useState(false);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to send OTP');
        setLoading(false);
        return;
      }

      // In development, auto-fill OTP
      if (data.data?.otp) {
        setOTP(data.data.otp);
      }

      setStep('otp');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Invalid OTP');
        setLoading(false);
        return;
      }

      if (data.data.requiresRegistration) {
        setStep('register');
        setLoading(false);
        return;
      }

      // Store token and redirect
      document.cookie = `auth_token=${data.data.token}; path=/; max-age=604800`; // 7 days
      localStorage.setItem('user', JSON.stringify(data.data.user));

      // Redirect based on role
      if (data.data.user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          name,
          organizationName: requiresOrgSetup ? organizationName : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // Store token and redirect
      document.cookie = `auth_token=${data.data.token}; path=/; max-age=604800`;
      localStorage.setItem('user', JSON.stringify(data.data.user));

      // Redirect based on role
      if (data.data.user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lead CRM</h1>
          <p className="text-gray-600">Sign in to continue</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {step === 'phone' && (
          <form onSubmit={handleRequestOTP}>
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
                className="w-full rounded-lg border-2 border-gray-300 p-4 text-lg focus:border-blue-500 focus:outline-none"
                placeholder="10-digit mobile"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full bg-blue-600 text-white rounded-lg py-4 px-6 text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP}>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                OTP sent to {phone}
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="ml-2 text-blue-600 hover:underline"
                >
                  Change
                </button>
              </p>

              <label className="block text-gray-700 font-medium mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOTP(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border-2 border-gray-300 p-4 text-lg text-center font-mono tracking-widest focus:border-blue-500 focus:outline-none"
                placeholder="000000"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-blue-600 text-white rounded-lg py-4 px-6 text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={handleRequestOTP}
              className="w-full mt-3 text-blue-600 hover:underline text-sm"
            >
              Resend OTP
            </button>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-4 text-lg focus:border-blue-500 focus:outline-none"
                placeholder="Enter your name"
                autoFocus
                required
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={requiresOrgSetup}
                  onChange={(e) => setRequiresOrgSetup(e.target.checked)}
                  className="mr-2 w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  I&apos;m setting up a new organization
                </span>
              </label>
            </div>

            {requiresOrgSetup && (
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 p-4 text-lg focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Bharath Cycle Hub"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-4 px-6 text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating account...' : 'Complete Registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
