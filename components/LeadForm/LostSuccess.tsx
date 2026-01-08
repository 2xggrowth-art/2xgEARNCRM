'use client';

import { useRouter } from 'next/navigation';
import WhatsAppButton from '@/components/WhatsAppButton';

interface LostSuccessProps {
  leadId: string;
  customerName: string;
  customerPhone: string;
  lostReason?: string;
  dealSize: number;
  modelName: string;
}

export default function LostSuccess({
  leadId,
  customerName,
  customerPhone,
  lostReason,
  dealSize,
  modelName,
}: LostSuccessProps) {
  const router = useRouter();

  const handleWhatsAppSuccess = (messageId: string) => {
    console.log('WhatsApp message sent successfully:', messageId);
    // Optional: Show a toast notification
  };

  const handleWhatsAppError = (error: string) => {
    console.error('Failed to send WhatsApp:', error);
    // Optional: Show error toast
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex flex-col h-full p-6 bg-white">
      {/* Success Icon */}
      <div className="flex flex-col items-center justify-center mt-8 mb-6">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-12 h-12 text-orange-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Lead Saved Successfully!</h2>
        <p className="text-gray-600 text-center mb-6">
          The lead has been marked as &quot;Lost&quot; but we can still follow up!
        </p>
      </div>

      {/* Lead Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Customer:</span>
          <span className="font-semibold text-gray-900">{customerName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Phone:</span>
          <span className="font-semibold text-gray-900">{customerPhone}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Model:</span>
          <span className="font-semibold text-gray-900">{modelName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Quoted Price:</span>
          <span className="font-semibold text-gray-900">{formatCurrency(dealSize)}</span>
        </div>
        {lostReason && (
          <div className="flex justify-between">
            <span className="text-gray-600">Reason:</span>
            <span className="font-semibold text-gray-900 text-right max-w-[60%]">
              {lostReason}
            </span>
          </div>
        )}
      </div>

      {/* Follow-up Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Follow-up Opportunity
        </h3>
        <p className="text-sm text-blue-800 mb-4">
          Send a WhatsApp message to follow up with this customer and increase the chance of
          conversion.
        </p>

        {/* WhatsApp Button */}
        <WhatsAppButton
          leadId={leadId}
          recipientPhone={customerPhone}
          templateName="lost_lead_followup"
          templateLanguage="en"
          parameters={{
            leadName: customerName,
            reason: lostReason || 'pricing concerns',
          }}
          buttonText="Send Follow-up on WhatsApp"
          className="w-full"
          onSuccess={handleWhatsAppSuccess}
          onError={handleWhatsAppError}
        />

        <p className="text-xs text-gray-500 mt-3 text-center">
          This will send a pre-approved template message to the customer
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto space-y-3">
        <button
          onClick={() => router.push('/lead/new')}
          className="w-full bg-blue-600 text-white rounded-lg py-4 px-6 text-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          Add Another Lead
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-white border-2 border-gray-300 text-gray-700 rounded-lg py-4 px-6 text-lg font-semibold hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
