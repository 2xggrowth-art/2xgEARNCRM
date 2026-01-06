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
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'reviewed' | 'yet_to_review'>('pending');
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  const handleReviewStatus = async (status: 'reviewed' | 'yet_to_review') => {
    setUpdatingStatus(true);
    try {
      const response = await fetch('/api/leads/update-review-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          invoiceNo,
          reviewStatus: status,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setReviewStatus(status);
      } else {
        alert(data.error || 'Failed to update review status');
      }
    } catch (error) {
      console.error('Error updating review status:', error);
      alert('Failed to update review status');
    } finally {
      setUpdatingStatus(false);
    }
  };

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

      <p className="text-sm text-gray-600 mb-4 max-w-xs">
        Scan the QR code to leave us a review or follow us on social media!
      </p>

      {/* Review Status Buttons */}
      {reviewStatus === 'pending' && (
        <div className="mb-6 w-full max-w-sm">
          <p className="text-sm text-gray-700 font-medium mb-3">
            Did the customer scan and review?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleReviewStatus('reviewed')}
              disabled={updatingStatus}
              className="bg-green-600 text-white rounded-lg py-3 px-4 font-semibold hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              ✓ Reviewed
            </button>
            <button
              onClick={() => handleReviewStatus('yet_to_review')}
              disabled={updatingStatus}
              className="bg-orange-600 text-white rounded-lg py-3 px-4 font-semibold hover:bg-orange-700 active:bg-orange-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              ⏳ Yet to Review
            </button>
          </div>
        </div>
      )}

      {/* Status Confirmation Messages */}
      {reviewStatus === 'reviewed' && (
        <div className="mb-6 w-full max-w-sm bg-green-50 border-2 border-green-500 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700">
            <span className="text-2xl">✓</span>
            <span className="font-semibold">Customer has reviewed!</span>
          </div>
          <p className="text-sm text-green-600 mt-1">Thank you for the feedback!</p>
        </div>
      )}

      {reviewStatus === 'yet_to_review' && (
        <div className="mb-6 w-full max-w-sm bg-orange-50 border-2 border-orange-500 rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-700">
            <span className="text-2xl">⏳</span>
            <span className="font-semibold">Marked as yet to review</span>
          </div>
          <p className="text-sm text-orange-600 mt-1">Customer will review later</p>
        </div>
      )}

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
