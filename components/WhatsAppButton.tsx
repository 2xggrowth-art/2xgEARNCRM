'use client';

import { useState } from 'react';
import { sendWhatsAppMessage } from '@/app/actions/whatsapp';
import type { SendWhatsAppMessageParams } from '@/lib/types/whatsapp';

interface WhatsAppButtonProps {
  leadId: string;
  recipientPhone: string;
  templateName: string;
  templateLanguage?: string;
  parameters?: {
    leadName?: string;
    reason?: string;
    customField1?: string;
    customField2?: string;
    customField3?: string;
    [key: string]: string | undefined;
  };
  buttonText?: string;
  className?: string;
  onSuccess?: (messageId: string) => void;
  onError?: (error: string) => void;
}

export default function WhatsAppButton({
  leadId,
  recipientPhone,
  templateName,
  templateLanguage = 'en',
  parameters,
  buttonText = 'Send WhatsApp',
  className = '',
  onSuccess,
  onError,
}: WhatsAppButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSendWhatsApp = async () => {
    setIsLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const messageParams: SendWhatsAppMessageParams = {
        leadId,
        recipientPhone,
        templateName,
        templateLanguage,
        parameters,
      };

      const result = await sendWhatsAppMessage(messageParams);

      if (result.success && result.messageId) {
        setStatus('success');
        onSuccess?.(result.messageId);

        // Auto-reset success state after 3 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      } else {
        setStatus('error');
        const error = result.error || 'Failed to send WhatsApp message';
        setErrorMessage(error);
        onError?.(error);
      }
    } catch (error) {
      setStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col gap-2">
      <button
        onClick={handleSendWhatsApp}
        disabled={isLoading}
        className={`
          flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200 ease-in-out
          ${
            status === 'success'
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : status === 'error'
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
          ${className}
        `}
        aria-label={buttonText}
      >
        {/* WhatsApp Icon SVG */}
        <svg
          className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`}
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>

        {/* Button Text with Loading State */}
        <span>
          {isLoading
            ? 'Sending...'
            : status === 'success'
            ? 'Sent!'
            : status === 'error'
            ? 'Failed'
            : buttonText}
        </span>

        {/* Loading Spinner */}
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
      </button>

      {/* Error Message Display */}
      {status === 'error' && errorMessage && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorMessage}
        </div>
      )}

      {/* Success Message Display */}
      {status === 'success' && (
        <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
          WhatsApp message sent successfully!
        </div>
      )}
    </div>
  );
}
