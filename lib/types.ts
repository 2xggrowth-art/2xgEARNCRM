// Database types
export type UserRole = 'admin' | 'sales_rep';

export type LeadStatus = 'win' | 'lost';

export type PurchaseTimeline = 'today' | '3_days' | '7_days' | '30_days';

export type NotTodayReason =
  | 'need_family_approval'
  | 'price_high'
  | 'want_more_options'
  | 'just_browsing'
  | 'other';

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  google_review_qr_url: string | null;
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
  status: LeadStatus;
  category_id: string;

  // Win-specific fields
  invoice_no?: string | null;
  sale_price?: number | null;

  // Lost-specific fields
  deal_size?: number | null;
  model_id?: string | null;
  purchase_timeline?: PurchaseTimeline | null;
  not_today_reason?: NotTodayReason | null;
  other_reason?: string | null; // Custom reason text when not_today_reason is 'other'
  lead_rating?: number | null; // Sales rep rating (1-5 stars) for likelihood of conversion - only for Lost leads

  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadWithDetails extends Lead {
  category_name?: string;
  sales_rep_name?: string;
  model_name?: string; // From models join
  models?: {
    name: string;
  };
  categories?: {
    name: string;
  };
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
  status: LeadStatus;
}

export interface Step2Data {
  categoryId: string;
}

// Win flow - Step 3 data
export interface WinStep3Data {
  invoiceNo: string;
  salePrice: number;
}

// Lost flow - Step 3 data
export interface LostStep3Data {
  dealSize: number;
  modelName: string;
}

// Lost flow - Step 4 data
export interface LostStep4Data {
  purchaseTimeline: PurchaseTimeline;
  notTodayReason?: NotTodayReason;
  otherReason?: string; // Custom reason text when notTodayReason is 'other'
  leadRating?: number; // Sales rep rating (1-5 stars) for likelihood of conversion
}

// Legacy types for backward compatibility
export type Step3Data = WinStep3Data | LostStep3Data;
export type Step4Data = LostStep4Data;

export interface LeadFormData {
  // Common fields
  customerName: string;
  customerPhone: string;
  categoryId: string;
  status: LeadStatus;

  // Win-specific fields
  invoiceNo?: string;
  salePrice?: number;

  // Lost-specific fields
  dealSize?: number;
  modelName?: string;
  purchase_timeline?: PurchaseTimeline;
  notTodayReason?: NotTodayReason;
}
