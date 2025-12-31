// Database types
export type UserRole = 'admin' | 'sales_rep';

export type PurchaseTimeline = 'today' | '3_days' | '7_days' | '30_days';

export type NotTodayReason =
  | 'need_family_approval'
  | 'price_high'
  | 'want_more_options'
  | 'just_browsing';

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  whatsapp_phone_number_id: string | null;
  whatsapp_access_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  organization_id: string;
  created_at: string;
  last_login: string | null;
}

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  sales_rep_id: string;
  customer_name: string;
  customer_phone: string;
  category_id: string;
  deal_size: number;
  model_name: string;
  purchase_timeline: PurchaseTimeline;
  not_today_reason: NotTodayReason | null;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadWithDetails extends Lead {
  category_name?: string;
  sales_rep_name?: string;
}

export interface OTPVerification {
  id: string;
  phone: string;
  otp: string;
  expires_at: string;
  verified: boolean;
  created_at: string;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  phone: string;
  role: UserRole;
  organizationId: string;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form data types
export interface Step1Data {
  name: string;
  phone: string;
}

export interface Step2Data {
  categoryId: string;
}

export interface Step3Data {
  dealSize: number;
  modelName: string;
}

export interface Step4Data {
  purchaseTimeline: PurchaseTimeline;
  notTodayReason?: NotTodayReason;
}

export interface LeadFormData extends Step1Data, Step3Data, Step4Data {
  categoryId: string;
}
