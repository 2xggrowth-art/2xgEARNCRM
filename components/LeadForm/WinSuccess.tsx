'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface WinSuccessProps {
  invoiceNo: string;
  salePrice: number;
  customerName?: string;
}

export default function WinSuccess({ invoiceNo, salePrice, customerName = 'Customer' }: WinSuccessProps) {
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('/download.png');
  const [loading, setLoading] = useState(true);
  const [showReviewScreen, setShowReviewScreen] = useState(true); // Show review screen directly
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'reviewed' | 'yet_to_review'>('pending');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [commissionEstimate, setCommissionEstimate] = useState(0);

  useEffect(() => {
    // Calculate estimated commission (1.2% default rate)
    setCommissionEstimate(Math.round(salePrice * 0.012));

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
      } finally {
        setLoading(false);
      }
    };

    fetchQrCode();
  }, [salePrice]);

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
        // Show success then go to dashboard after delay
        setTimeout(() => router.push('/dashboard'), status === 'reviewed' ? 2000 : 1500);
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

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Review Screen (shown directly after sale)
  if (showReviewScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 to-orange-500 p-4">
        {/* Sale Success Banner */}
        <div className="bg-white/95 rounded-xl p-3 mb-4 flex items-center gap-3 shadow-lg animate-slide-up">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">✓</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">Sale Recorded!</p>
            <p className="text-sm text-gray-600">Invoice: {invoiceNo}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Commission</p>
            <p className="font-bold text-green-600">{formatCurrency(commissionEstimate)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-auto text-center animate-slide-up">
          <div className="text-5xl mb-3">⭐</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ask for Google Review</h1>
          <p className="text-gray-600 mb-4">Show QR code to customer</p>

          {/* QR Code */}
          <div className="bg-gray-100 rounded-xl p-6 mb-4">
            <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center border-4 border-gray-200 overflow-hidden">
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : qrCodeUrl.startsWith('data:') || qrCodeUrl.startsWith('http') ? (
                <img
                  src={qrCodeUrl}
                  alt="Google Review QR Code"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image
                  src={qrCodeUrl}
                  alt="QR Code"
                  width={180}
                  height={180}
                  className="object-contain"
                  priority
                />
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Customer: <span className="font-bold">{customerName}</span>
          </p>


          {/* Review Status */}
          {reviewStatus === 'pending' ? (
            <div className="space-y-3">
              <button
                onClick={() => handleReviewStatus('reviewed')}
                disabled={updatingStatus}
                className="btn-mobile w-full h-12 bg-green-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>✓</span>
                <span>Customer Reviewed</span>
              </button>
              <button
                onClick={() => handleReviewStatus('yet_to_review')}
                disabled={updatingStatus}
                className="btn-mobile w-full h-12 bg-gray-200 text-gray-700 rounded-xl font-medium"
              >
                Yet to Review / Skip
              </button>
            </div>
          ) : reviewStatus === 'reviewed' ? (
            <div className="bg-green-100 border border-green-300 rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">🌟</div>
              <p className="font-bold text-green-700">Review Submitted!</p>
              <p className="text-green-600 text-sm">Thank you for getting the review</p>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-4">
              <p className="text-gray-600">Marked as Yet to Review</p>
            </div>
          )}

        </div>

        {/* Tips */}
        <div className="mt-4 bg-white/20 rounded-xl p-4 max-w-sm mx-auto">
          <p className="text-white text-sm font-medium mb-2">💡 Tips:</p>
          <ul className="text-white/90 text-xs space-y-1">
            <li>• Show QR while packing their purchase</li>
            <li>• "Would you mind leaving us a quick review?"</li>
            <li>• Takes less than 30 seconds</li>
          </ul>
        </div>

        {reviewStatus !== 'pending' && (
          <div className="mt-4 max-w-sm mx-auto">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-white text-orange-600 rounded-xl py-3 font-bold shadow-lg"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    );
  }

  // Main Success Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center animate-slide-up">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sale Recorded!</h1>
        <p className="text-gray-600 mb-4">Commission auto-calculated</p>

        <div className="bg-green-50 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-600">Invoice</p>
          <p className="text-xl font-bold text-gray-900">{invoiceNo}</p>
          <p className="text-sm text-gray-600 mt-3">Commission Earned</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(commissionEstimate)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Sale: {formatCurrency(salePrice)}
          </p>
        </div>

        {/* Ask for Review */}
        <button
          onClick={() => setShowReviewScreen(true)}
          className="btn-mobile w-full h-12 bg-yellow-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 mb-3"
        >
          <span>⭐</span>
          <span>Ask for Google Review</span>
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          className="btn-mobile w-full h-12 bg-gray-200 text-gray-800 rounded-xl font-bold"
        >
          Done
        </button>
      </div>
    </div>
  );
}
