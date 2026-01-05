'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface WinSuccessProps {
  invoiceNo: string;
  salePrice: number;
}

export default function WinSuccess({ invoiceNo, salePrice }: WinSuccessProps) {
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('/download.png'); // Default fallback QR code
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch organization's Google Review QR code
    const fetchQrCode = async () => {
      try {
        const response = await fetch('/api/admin/organization', {
          credentials: 'include',
        });
        const data = await response.json();

        if (data.success && data.data.google_review_qr_url) {
          setQrCodeUrl(data.data.google_review_qr_url);
        }
      } catch (error) {
        console.error('Error fetching QR code:', error);
        // Keep using default QR code
      } finally {
        setLoading(false);
      }
    };

    fetchQrCode();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="mb-4">
        <div className="text-6xl mb-2">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Sale Completed!
        </h1>
        <p className="text-gray-600 text-lg">Thank you for choosing us!</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-6 border-2 border-gray-100">
        {loading ? (
          <div className="w-[200px] h-[200px] flex items-center justify-center">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : qrCodeUrl.startsWith('data:') || qrCodeUrl.startsWith('http') ? (
          // Base64 or external URL - use img tag
          <img
            src={qrCodeUrl}
            alt="Google Review QR Code"
            className="w-[200px] h-[200px] object-contain mx-auto"
          />
        ) : (
          // Local path - use Next.js Image
          <Image
            src={qrCodeUrl}
            alt="QR Code"
            width={200}
            height={200}
            className="mx-auto"
            priority
          />
        )}
      </div>

      <p className="text-sm text-gray-600 mb-6 max-w-xs">
        Scan the QR code to leave us a review or follow us on social media!
      </p>

      <div className="bg-green-50 border-2 border-green-200 p-5 rounded-lg mb-8 w-full max-w-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600 font-medium">Invoice:</span>
          <span className="text-gray-900 font-bold text-lg">{invoiceNo}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Amount:</span>
          <span className="text-green-600 font-bold text-xl">
            ₹{salePrice.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <button
        onClick={() => router.push('/dashboard')}
        className="w-full bg-green-600 text-white rounded-lg py-4 px-6 text-lg font-semibold hover:bg-green-700 active:bg-green-800 transition-colors shadow-md"
      >
        Continue to Dashboard
      </button>
    </div>
  );
}
