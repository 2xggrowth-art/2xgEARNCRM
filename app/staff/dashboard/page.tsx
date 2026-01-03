'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Staff Dashboard - Redirects to main dashboard
 * Staff members use the same dashboard as sales reps for now
 */
export default function StaffDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Verify role
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'staff') {
      router.push('/login');
      return;
    }

    // Redirect to main dashboard (staff uses same UI as sales_rep for now)
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
