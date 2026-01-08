'use server';

import { supabaseAdmin } from '@/lib/supabase';
import {
  WhatsAppCredentials,
  WhatsAppTemplateMessage,
  WhatsAppAPIResponse,
  WhatsAppAPIError,
  SendWhatsAppMessageParams,
  SendWhatsAppMessageResult,
  WhatsAppTemplateComponent,
} from '@/lib/types/whatsapp';
import { cookies } from 'next/headers';

/**
 * Gets user data from cookie
 * @returns User data including organizationId and userId
 */
async function getUserFromCookie(): Promise<{
  organizationId: string;
  userId: string;
  role: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie?.value) {
      return null;
    }

    const userData = JSON.parse(userCookie.value);
    return {
      organizationId: userData.organizationId || null,
      userId: userData.id || null,
      role: userData.role || null,
    };
  } catch (error) {
    console.error('Error parsing user cookie:', error);
    return null;
  }
}

/**
 * Fetches WhatsApp credentials for a specific organization
 * @param organizationId - The organization ID
 * @returns WhatsApp credentials or null if not configured
 */
async function getWhatsAppCredentials(organizationId: string): Promise<WhatsAppCredentials | null> {
  try {
    // Fetch WhatsApp credentials for the organization
    const { data: credentials, error: credError } = await supabaseAdmin
      .from('whatsapp_credentials')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    if (credError) {
      console.error('Error fetching WhatsApp credentials:', credError);
      return null;
    }

    return credentials as WhatsAppCredentials;
  } catch (error) {
    console.error('Error in getWhatsAppCredentials:', error);
    return null;
  }
}

/**
 * Builds template components with parameters
 * @param parameters - Template parameters like lead name, reason, etc.
 * @returns Array of template components
 */
function buildTemplateComponents(
  parameters?: SendWhatsAppMessageParams['parameters']
): WhatsAppTemplateComponent[] | undefined {
  if (!parameters || Object.keys(parameters).length === 0) {
    return undefined;
  }

  const components: WhatsAppTemplateComponent[] = [];

  // Build body component with text parameters
  // This handles {{1}}, {{2}}, {{3}}, etc. in the template
  const textParams = Object.entries(parameters)
    .filter(([_, value]) => value !== undefined && value !== '')
    .map(([_, value]) => ({
      type: 'text' as const,
      text: value!,
    }));

  if (textParams.length > 0) {
    components.push({
      type: 'body',
      parameters: textParams,
    });
  }

  return components.length > 0 ? components : undefined;
}

/**
 * Sends a WhatsApp template message using Meta's Graph API
 * @param params - Message parameters including recipient, template, and variables
 * @returns Result with success status and message ID or error
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppMessageParams
): Promise<SendWhatsAppMessageResult> {
  try {
    // 1. Get user data from cookie
    const user = await getUserFromCookie();

    if (!user || !user.organizationId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // 2. Fetch WhatsApp credentials
    const credentials = await getWhatsAppCredentials(user.organizationId);

    if (!credentials) {
      return {
        success: false,
        error: 'WhatsApp credentials not configured. Please contact your administrator.',
      };
    }

    // 3. Validate phone number format (remove spaces, ensure + prefix)
    let recipientPhone = params.recipientPhone.replace(/\s/g, '');
    if (!recipientPhone.startsWith('+')) {
      recipientPhone = '+' + recipientPhone;
    }

    // Remove + for Meta API (it doesn't accept + prefix)
    const formattedPhone = recipientPhone.replace('+', '');

    // 4. Build template message payload
    const components = buildTemplateComponents(params.parameters);

    const messagePayload: WhatsAppTemplateMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: params.templateName,
        language: {
          code: params.templateLanguage || 'en', // Default to English
        },
        ...(components && { components }),
      },
    };

    // 5. Send request to Meta's Graph API
    const apiUrl = `https://graph.facebook.com/v18.0/${credentials.phone_number_id}/messages`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.whatsapp_access_token}`,
      },
      body: JSON.stringify(messagePayload),
    });

    const responseData = await response.json();

    // 6. Handle API errors
    if (!response.ok) {
      const errorData = responseData as WhatsAppAPIError;
      console.error('WhatsApp API Error:', errorData);

      // Log failed attempt
      await logWhatsAppMessage({
        leadId: params.leadId,
        recipientPhone: formattedPhone,
        templateName: params.templateName,
        status: 'failed',
        errorMessage: errorData.error.message,
        parameters: params.parameters,
        organizationId: credentials.organization_id,
        userId: user.userId,
      });

      return {
        success: false,
        error: errorData.error.message || 'Failed to send WhatsApp message',
      };
    }

    // 7. Success - extract message ID
    const successData = responseData as WhatsAppAPIResponse;
    const messageId = successData.messages[0]?.id;

    // 8. Log successful send
    const logId = await logWhatsAppMessage({
      leadId: params.leadId,
      recipientPhone: formattedPhone,
      templateName: params.templateName,
      status: 'sent',
      messageId,
      parameters: params.parameters,
      organizationId: credentials.organization_id,
      userId: user.userId,
    });

    return {
      success: true,
      messageId,
      logId,
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Logs WhatsApp message send attempt to database
 */
async function logWhatsAppMessage(params: {
  leadId: string;
  recipientPhone: string;
  templateName: string;
  status: 'sent' | 'failed';
  messageId?: string;
  errorMessage?: string;
  parameters?: Record<string, any>;
  organizationId: string;
  userId: string;
}): Promise<string | undefined> {
  try {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_message_logs')
      .insert({
        organization_id: params.organizationId,
        lead_id: params.leadId,
        user_id: params.userId,
        recipient_phone: params.recipientPhone,
        template_name: params.templateName,
        message_type: 'template',
        message_id: params.messageId,
        status: params.status,
        error_message: params.errorMessage,
        template_parameters: params.parameters,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error logging WhatsApp message:', error);
      return undefined;
    }

    return data?.id;
  } catch (error) {
    console.error('Error in logWhatsAppMessage:', error);
    return undefined;
  }
}

/**
 * Checks if WhatsApp is configured for the current organization
 * @returns Boolean indicating if WhatsApp is set up
 */
export async function isWhatsAppConfigured(): Promise<boolean> {
  const user = await getUserFromCookie();

  if (!user || !user.organizationId) {
    return false;
  }

  const credentials = await getWhatsAppCredentials(user.organizationId);
  return credentials !== null;
}

/**
 * Gets WhatsApp configuration status and metadata (without exposing sensitive tokens)
 * @returns Configuration status and metadata
 */
export async function getWhatsAppStatus(): Promise<{
  configured: boolean;
  businessName?: string;
  phoneNumber?: string;
}> {
  const user = await getUserFromCookie();

  if (!user || !user.organizationId) {
    return { configured: false };
  }

  const credentials = await getWhatsAppCredentials(user.organizationId);

  if (!credentials) {
    return { configured: false };
  }

  return {
    configured: true,
    businessName: credentials.business_name || undefined,
    phoneNumber: credentials.phone_number || undefined,
  };
}

/**
 * Saves or updates WhatsApp credentials for the organization
 * Only accessible by admins/owners
 */
export async function saveWhatsAppCredentials(data: {
  whatsapp_access_token: string;
  phone_number_id: string;
  waba_id: string;
  phone_number?: string;
  business_name?: string;
  is_active: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserFromCookie();

    if (!user || !user.organizationId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(user.role)) {
      return { success: false, error: 'Only admins can configure WhatsApp credentials' };
    }

    // Upsert credentials (insert or update if exists)
    const { error: upsertError } = await supabaseAdmin
      .from('whatsapp_credentials')
      .upsert(
        {
          organization_id: user.organizationId,
          ...data,
        },
        {
          onConflict: 'organization_id',
        }
      );

    if (upsertError) {
      console.error('Error saving WhatsApp credentials:', upsertError);
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in saveWhatsAppCredentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
