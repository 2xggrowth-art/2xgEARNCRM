'use client';

import WhatsAppButton from './WhatsAppButton';

/**
 * Example component showing how to use the WhatsAppButton
 * This demonstrates sending template messages with parameters
 */
export default function WhatsAppMessageExample() {
  // Example: Send a "Lead Lost" follow-up message
  const handleSuccess = (messageId: string) => {
    console.log('WhatsApp message sent successfully with ID:', messageId);
    // You can add additional logic here like:
    // - Update lead status
    // - Show toast notification
    // - Refresh data
  };

  const handleError = (error: string) => {
    console.error('Failed to send WhatsApp message:', error);
    // You can add error handling logic here like:
    // - Show error toast
    // - Log to error tracking service
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900">WhatsApp Message Examples</h2>

      {/* Example 1: Simple template without parameters */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-700">1. Simple Template (No Parameters)</h3>
        <p className="text-sm text-gray-600">
          Send a pre-approved template without any dynamic parameters.
        </p>
        <WhatsAppButton
          leadId="550e8400-e29b-41d4-a716-446655440000"
          recipientPhone="+919876543210"
          templateName="hello_world"
          templateLanguage="en"
        />
      </div>

      {/* Example 2: Template with Lead Name parameter */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-700">
          2. Welcome Template (With Lead Name)
        </h3>
        <p className="text-sm text-gray-600">
          Template: "Hello {`{{1}}`}, welcome to our store!"
        </p>
        <WhatsAppButton
          leadId="550e8400-e29b-41d4-a716-446655440001"
          recipientPhone="+919876543210"
          templateName="welcome_message"
          templateLanguage="en"
          parameters={{
            leadName: 'Rajesh Kumar',
          }}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>

      {/* Example 3: Lost Lead Follow-up with multiple parameters */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-700">
          3. Lost Lead Follow-up (Multiple Parameters)
        </h3>
        <p className="text-sm text-gray-600">
          Template: "Hi {`{{1}}`}, we noticed you didn't purchase because: {`{{2}}`}. Can we help?"
        </p>
        <WhatsAppButton
          leadId="550e8400-e29b-41d4-a716-446655440002"
          recipientPhone="+919876543210"
          templateName="lost_lead_followup"
          templateLanguage="en"
          parameters={{
            leadName: 'Priya Sharma',
            reason: 'Price was too high',
          }}
          buttonText="Send Follow-up"
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>

      {/* Example 4: Custom styling */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-700">4. Custom Styled Button</h3>
        <p className="text-sm text-gray-600">You can customize the button appearance.</p>
        <WhatsAppButton
          leadId="550e8400-e29b-41d4-a716-446655440003"
          recipientPhone="+919876543210"
          templateName="order_confirmation"
          templateLanguage="en"
          parameters={{
            leadName: 'Amit Patel',
            customField1: 'ORD-12345',
            customField2: '₹5,999',
          }}
          buttonText="Send Order Confirmation"
          className="w-full text-lg py-3"
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Usage Instructions</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Required Props:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <code className="bg-blue-100 px-1 rounded">leadId</code>: UUID of the lead
            </li>
            <li>
              <code className="bg-blue-100 px-1 rounded">recipientPhone</code>: Phone number with
              country code (e.g., +919876543210)
            </li>
            <li>
              <code className="bg-blue-100 px-1 rounded">templateName</code>: Name of the approved
              WhatsApp template in Meta Business Manager
            </li>
          </ul>

          <p className="mt-3">
            <strong>Optional Props:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <code className="bg-blue-100 px-1 rounded">templateLanguage</code>: Language code
              (default: "en")
            </li>
            <li>
              <code className="bg-blue-100 px-1 rounded">parameters</code>: Object with template
              variables (leadName, reason, etc.)
            </li>
            <li>
              <code className="bg-blue-100 px-1 rounded">buttonText</code>: Custom button text
              (default: "Send WhatsApp")
            </li>
            <li>
              <code className="bg-blue-100 px-1 rounded">className</code>: Additional Tailwind
              classes
            </li>
            <li>
              <code className="bg-blue-100 px-1 rounded">onSuccess</code>: Callback when message
              sent successfully
            </li>
            <li>
              <code className="bg-blue-100 px-1 rounded">onError</code>: Callback when sending
              fails
            </li>
          </ul>

          <p className="mt-3">
            <strong>Important Notes:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              WhatsApp credentials must be configured in Admin Settings (
              <code className="bg-blue-100 px-1 rounded">whatsapp_credentials</code> table)
            </li>
            <li>Only pre-approved templates from Meta Business Manager can be used</li>
            <li>Template parameters map to placeholders like {`{{1}}`}, {`{{2}}`}, etc.</li>
            <li>Phone numbers must include country code (e.g., +91 for India)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
