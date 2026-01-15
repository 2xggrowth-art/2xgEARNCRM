'use server';

import { supabaseAdmin } from '@/lib/supabase';
import {
  WhatsAppTemplateMessage,
  WhatsAppAPIResponse,
  WhatsAppAPIError,
  SendWhatsAppMessageParams,
  SendWhatsAppMessageResult,
  WhatsAppTemplateComponent,
} from '@/lib/types/whatsapp';
import { WhatsAppProvider, WhatsAppConfig, MetaWhatsAppConfig, WhatstoolConfig } from '@/lib/types';
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
 * Fetches WhatsApp configuration for a specific organization
 * @param organizationId - The organization ID
 * @returns WhatsApp configuration with provider info or null if not configured
 */
async function getWhatsAppCredentials(organizationId: string): Promise<{
  provider: WhatsAppProvider;
  config: WhatsAppConfig;
  isActive: boolean;
  phoneNumber?: string;
  businessName?: string;
  organizationId: string;
} | null> {
  try {
    // Fetch WhatsApp configuration from organizations table
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('whatsapp_provider, whatsapp_config, whatsapp_is_active, whatsapp_phone_number, whatsapp_business_name')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgError) {
      console.error('Error fetching WhatsApp configuration:', orgError);
      return null;
    }

    if (!org || !org.whatsapp_is_active || !org.whatsapp_config) {
      return null;
    }

    return {
      provider: org.whatsapp_provider as WhatsAppProvider || 'meta',
      config: org.whatsapp_config as WhatsAppConfig,
      isActive: org.whatsapp_is_active,
      phoneNumber: org.whatsapp_phone_number,
      businessName: org.whatsapp_business_name,
      organizationId,
    };
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
 * Sends WhatsApp message via Meta Cloud API
 */
async function sendMetaWhatsAppMessage(
  config: MetaWhatsAppConfig,
  recipientPhone: string,
  templateName: string,
  templateLanguage: string,
  parameters?: SendWhatsAppMessageParams['parameters']
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate phone number format (remove spaces, ensure + prefix)
    let formattedPhone = recipientPhone.replace(/\s/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    // Remove + for Meta API (it doesn't accept + prefix)
    formattedPhone = formattedPhone.replace('+', '');

    // Build template message payload
    const components = buildTemplateComponents(parameters);

    const messagePayload: WhatsAppTemplateMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: templateLanguage,
        },
        ...(components && { components }),
      },
    };

    // Send request to Meta's Graph API
    const apiUrl = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(messagePayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      const errorData = responseData as WhatsAppAPIError;
      return {
        success: false,
        error: errorData.error.message || 'Failed to send WhatsApp message',
      };
    }

    const successData = responseData as WhatsAppAPIResponse;
    const messageId = successData.messages[0]?.id;

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Sends WhatsApp message via Whatstool.business API
 */
async function sendWhatstoolWhatsAppMessage(
  config: WhatstoolConfig,
  recipientPhone: string,
  templateId: string,
  parameters?: SendWhatsAppMessageParams['parameters']
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate phone number format (remove spaces, ensure no + prefix)
    let formattedPhone = recipientPhone.replace(/\s/g, '');
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    // Build body_text_variables from parameters (pipe-separated)
    let bodyTextVariables = '';
    if (parameters && Object.keys(parameters).length > 0) {
      const values = Object.entries(parameters)
        .filter(([_, value]) => value !== undefined && value !== '')
        .map(([_, value]) => value);
      bodyTextVariables = values.join('|');
    }

    // Build request payload
    const messagePayload = {
      template_id: templateId,
      body_text_variables: bodyTextVariables,
    };

    // Send request to Whatstool API
    const apiUrl = `https://developers.whatstool.business/v2/messages/${config.channelNumber}/${formattedPhone}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
      body: JSON.stringify(messagePayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: responseData.message || 'Failed to send WhatsApp message via Whatstool',
      };
    }

    // Whatstool may return a message ID in the response
    const messageId = responseData.message_id || responseData.id;

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Sends a WhatsApp template message using the configured provider
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

    // 2. Fetch WhatsApp configuration
    const whatsappConfig = await getWhatsAppCredentials(user.organizationId);

    if (!whatsappConfig) {
      return {
        success: false,
        error: 'WhatsApp not configured. Please contact your administrator.',
      };
    }

    // 3. Validate phone number format
    let recipientPhone = params.recipientPhone.replace(/\s/g, '');
    if (!recipientPhone.startsWith('+')) {
      recipientPhone = '+' + recipientPhone;
    }

    // 4. Send message based on provider
    let result: { success: boolean; messageId?: string; error?: string };

    if (whatsappConfig.provider === 'meta') {
      const metaConfig = whatsappConfig.config as MetaWhatsAppConfig;
      result = await sendMetaWhatsAppMessage(
        metaConfig,
        recipientPhone,
        params.templateName,
        params.templateLanguage || 'en',
        params.parameters
      );
    } else if (whatsappConfig.provider === 'whatstool') {
      const whatstoolConfig = whatsappConfig.config as WhatstoolConfig;
      result = await sendWhatstoolWhatsAppMessage(
        whatstoolConfig,
        recipientPhone,
        params.templateName, // templateName is used as template_id for Whatstool
        params.parameters
      );
    } else {
      return {
        success: false,
        error: 'Unsupported WhatsApp provider',
      };
    }

    // 5. Format phone for logging
    const formattedPhone = recipientPhone.replace('+', '');

    // 6. Log the attempt
    if (!result.success) {
      await logWhatsAppMessage({
        leadId: params.leadId,
        recipientPhone: formattedPhone,
        templateName: params.templateName,
        status: 'failed',
        errorMessage: result.error,
        parameters: params.parameters,
        organizationId: whatsappConfig.organizationId,
        userId: user.userId,
      });

      return {
        success: false,
        error: result.error || 'Failed to send WhatsApp message',
      };
    }

    // 7. Log successful send
    const logId = await logWhatsAppMessage({
      leadId: params.leadId,
      recipientPhone: formattedPhone,
      templateName: params.templateName,
      status: 'sent',
      messageId: result.messageId,
      parameters: params.parameters,
      organizationId: whatsappConfig.organizationId,
      userId: user.userId,
    });

    return {
      success: true,
      messageId: result.messageId,
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
  provider?: WhatsAppProvider;
  config?: any;
  businessName?: string;
  phoneNumber?: string;
  isActive?: boolean;
}> {
  const user = await getUserFromCookie();

  if (!user || !user.organizationId) {
    return { configured: false };
  }

  const credentials = await getWhatsAppCredentials(user.organizationId);

  if (!credentials) {
    return { configured: false };
  }

  // Return metadata without sensitive tokens
  const sanitizedConfig = credentials.provider === 'meta'
    ? {
        phoneNumberId: (credentials.config as MetaWhatsAppConfig).phoneNumberId,
        wabaId: (credentials.config as MetaWhatsAppConfig).wabaId,
        selectedTemplate: (credentials.config as MetaWhatsAppConfig).selectedTemplate,
      }
    : credentials.provider === 'whatstool'
    ? {
        channelNumber: (credentials.config as WhatstoolConfig).channelNumber,
      }
    : {};

  return {
    configured: true,
    provider: credentials.provider,
    config: sanitizedConfig,
    businessName: credentials.businessName || undefined,
    phoneNumber: credentials.phoneNumber || undefined,
    isActive: credentials.isActive,
  };
}

/**
 * Saves or updates WhatsApp credentials for the organization
 * Only accessible by admins/owners
 */
export async function saveWhatsAppCredentials(data: {
  provider: WhatsAppProvider;
  config: WhatsAppConfig;
  phoneNumber?: string;
  businessName?: string;
  isActive: boolean;
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

    // Update organization with WhatsApp configuration
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        whatsapp_provider: data.provider,
        whatsapp_config: data.config,
        whatsapp_is_active: data.isActive,
        whatsapp_phone_number: data.phoneNumber,
        whatsapp_business_name: data.businessName,
      })
      .eq('id', user.organizationId);

    if (updateError) {
      console.error('Error saving WhatsApp credentials:', updateError);
      return { success: false, error: updateError.message };
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
