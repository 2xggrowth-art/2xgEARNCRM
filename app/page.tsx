'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user');

    if (user) {
      const userData = JSON.parse(user);
      // Redirect based on role
      switch (userData.role) {
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
    } else {
      // Not logged in, redirect to login
      router.push('/login');
    }
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
