'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface WinSuccessProps {
  invoiceNo: string;
  salePrice: number;
}

export default function WinSuccess({ invoiceNo, salePrice }: WinSuccessProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="mb-4">
        <div className="text-6xl mb-2">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Sale Completed!
        </h1>
        <p className="text-gray-600 text-lg">Thank you for choosing us!</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-4 border-2 border-gray-100">
        <Image
          src="/download.svg"
          alt="QR Code"
          width={200}
          height={200}
          className="mx-auto"
          priority
        />
      </div>

      <p className="text-xs text-orange-600 mb-2 font-medium">
        ⚠️ Replace /public/download.svg with your QR code
      </p>

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
