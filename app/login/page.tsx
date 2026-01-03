'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });

      const data = await response.json();

      if (!data.success) {
        // Check if it's a "not set up" error - might be first admin
        if (response.status === 401 && data.error?.includes('not set up')) {
          setStep('register');
          setLoading(false);
          return;
        }

        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Store token and user data
      document.cookie = `auth_token=${data.data.token}; path=/; max-age=604800`; // 7 days
      document.cookie = `user=${JSON.stringify(data.data.user)}; path=/; max-age=604800`;
      localStorage.setItem('token', data.data.token); // Store token in localStorage
      localStorage.setItem('user', JSON.stringify(data.data.user));

      // Redirect based on role
      switch (data.data.user.role) {
        case 'super_admin':
          router.push('/super-admin/dashboard');
          break;
        case 'manager':
          router.push('/manager/dashboard');
          break;
        case 'staff':
          router.push('/staff/dashboard');
          break;
        case 'admin': // Backward compatibility
        case 'sales_rep':
        default:
          router.push('/dashboard');
          break;
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
          organizationName,
          pin,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // Store token and user data
      document.cookie = `auth_token=${data.data.token}; path=/; max-age=604800`;
      document.cookie = `user=${JSON.stringify(data.data.user)}; path=/; max-age=604800`;
      localStorage.setItem('token', data.data.token); // Store token in localStorage
      localStorage.setItem('user', JSON.stringify(data.data.user));

      // Redirect based on role (registration creates manager role by default)
      switch (data.data.user.role) {
        case 'super_admin':
          router.push('/super-admin/dashboard');
          break;
        case 'manager':
          router.push('/manager/dashboard');
          break;
        case 'staff':
          router.push('/staff/dashboard');
          break;
        case 'admin': // Backward compatibility
        case 'sales_rep':
        default:
          router.push('/dashboard');
          break;
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 'login' ? 'Sign in to Lead CRM' : 'Create Organization'}
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {step === 'login' ? (
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="phone" className="sr-only">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  maxLength={10}
                  className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Phone Number (10 digits)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div>
                <label htmlFor="pin" className="sr-only">
                  4-Digit PIN
                </label>
                <input
                  id="pin"
                  name="pin"
                  type="password"
                  required
                  maxLength={4}
                  className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="4-Digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || phone.length !== 10 || pin.length !== 4}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep('register');
                  setError('');
                  setPhone('');
                  setPin('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleRegister}>
            <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded">
              Create your organization and set up your admin account.
            </div>

            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="org-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  id="org-name"
                  name="org-name"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter organization name"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="admin-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  id="admin-name"
                  name="admin-name"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Admin Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="admin-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="admin-phone"
                  name="admin-phone"
                  type="tel"
                  required
                  maxLength={10}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="10-digit phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div>
                <label htmlFor="admin-pin" className="block text-sm font-medium text-gray-700 mb-1">
                  Create 4-Digit PIN
                </label>
                <input
                  id="admin-pin"
                  name="admin-pin"
                  type="password"
                  required
                  maxLength={4}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="4-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
                <p className="mt-1 text-xs text-gray-500">You'll use this PIN to login</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('login');
                  setError('');
                }}
                className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Login
              </button>
              <button
                type="submit"
                disabled={loading || phone.length !== 10 || pin.length !== 4 || !name || !organizationName}
                className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
