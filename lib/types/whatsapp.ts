// TypeScript types for WhatsApp Cloud API integration

export interface WhatsAppCredentials {
  id: string;
  organization_id: string;
  whatsapp_access_token: string;
  phone_number_id: string;
  waba_id: string;
  phone_number?: string;
  business_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessageLog {
  id: string;
  organization_id: string;
  lead_id?: string;
  user_id?: string;
  recipient_phone: string;
  template_name?: string;
  message_type: 'template' | 'text';
  message_id?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  error_message?: string;
  sent_at: string;
  template_parameters?: Record<string, any>;
}

// Meta WhatsApp Cloud API Types
export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: WhatsAppParameter[];
}

export interface WhatsAppParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename?: string;
  };
  video?: {
    link: string;
  };
}

export interface WhatsAppTemplateMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: WhatsAppTemplateComponent[];
  };
}

export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: {
    preview_url?: boolean;
    body: string;
  };
}

export type WhatsAppMessage = WhatsAppTemplateMessage | WhatsAppTextMessage;

// Meta API Response Types
export interface WhatsAppAPIResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface WhatsAppAPIError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// Send WhatsApp Message Action Types
export interface SendWhatsAppMessageParams {
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
}

export interface SendWhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  logId?: string;
}

// Settings Form Types
export interface WhatsAppCredentialsForm {
  whatsapp_access_token: string;
  phone_number_id: string;
  waba_id: string;
  phone_number?: string;
  business_name?: string;
  is_active: boolean;
}
