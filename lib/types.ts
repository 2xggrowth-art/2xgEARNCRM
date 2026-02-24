// Database types
export type UserRole = 'super_admin' | 'manager' | 'staff' | 'sales_rep';

export type LeadStatus = 'win' | 'lost';

export type PurchaseTimeline = 'today' | '3_days' | '7_days' | '30_days';

export type NotTodayReason =
  | 'need_family_approval'
  | 'price_high'
  | 'want_more_options'
  | 'just_browsing'
  | 'other';

export type ReviewStatus = 'pending' | 'reviewed' | 'yet_to_review';

export type WhatsAppProvider = 'meta' | 'whatstool' | 'other';

// WhatsApp Provider Configuration Types
export interface MetaWhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
  phoneNumber?: string;
  businessName?: string;
  selectedTemplate?: string;
}

export interface WhatstoolConfig {
  apiKey: string;
  channelNumber: string;
  businessName?: string;
}

export type WhatsAppConfig = MetaWhatsAppConfig | WhatstoolConfig | Record<string, any>;

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  google_review_qr_url: string | null;
  contact_number: string | null;
  whatsapp_provider: WhatsAppProvider;
  whatsapp_config: WhatsAppConfig;
  whatsapp_is_active: boolean;
  waba_id: string | null;
  // Legacy fields (deprecated, kept for backward compatibility)
  whatsapp_phone_number_id?: string | null;
  whatsapp_access_token?: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  organization_id: string;
  manager_id?: string | null;
  created_at: string;
  last_login: string | null;
}

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  display_order: number;
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
  review_status?: ReviewStatus | null; // Review tracking for Win leads
  reviewed_by?: string | null; // User ID of who reviewed the lead

  // Lost-specific fields
  deal_size?: number | null;
  model_id?: string | null;
  purchase_timeline?: PurchaseTimeline | null;
  not_today_reason?: NotTodayReason | null;
  other_reason?: string | null; // Custom reason text when not_today_reason is 'other'
  lead_rating?: number | null; // Sales rep rating (1-5 stars) for likelihood of conversion - only for Lost leads

  // Incentive fields
  has_incentive?: boolean | null; // null = not set, false = no incentive, true = has incentive
  incentive_amount?: number | null; // The incentive amount (only set if has_incentive = true)

  // 2XG Earn: Auto-calculated commission fields
  commission_rate_applied?: number | null; // The commission rate used for this sale
  commission_amount?: number | null; // The calculated commission amount

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

// ================================================
// 2XG EARN INCENTIVE SYSTEM TYPES
// ================================================

export type PenaltyType =
  | 'late_arrival'
  | 'unauthorized_absence'
  | 'back_to_back_offs'
  | 'low_compliance'
  | 'high_error_rate'
  | 'non_escalated_lost_lead'
  | 'missing_documentation'
  | 'low_team_eval'
  | 'client_disrespect';

export type PenaltyStatus = 'active' | 'disputed' | 'resolved' | 'waived';

export type IncentiveStatus = 'calculating' | 'pending_review' | 'approved' | 'paid' | 'rejected';

export type TeamPoolStatus = 'calculating' | 'pending_approval' | 'approved' | 'distributed';

export type StaffType = 'sales' | 'support' | 'manager' | 'admin';

export interface CommissionRate {
  id: string;
  organization_id: string;
  category_name: string;
  category_id: string | null;
  commission_percentage: number;
  multiplier: number;
  min_sale_price: number;
  premium_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyTarget {
  id: string;
  user_id: string;
  organization_id: string;
  month: string; // Format: 'YYYY-MM'
  target_amount: number;
  achieved_amount: number;
  achievement_percentage: number;
  qualifies_for_incentive: boolean;
  set_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Penalty {
  id: string;
  user_id: string;
  organization_id: string;
  month: string;
  penalty_type: PenaltyType;
  penalty_percentage: number;
  description: string | null;
  incident_date: string | null;
  related_lead_id: string | null;
  status: PenaltyStatus;
  disputed_at: string | null;
  dispute_reason: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PenaltyWithDetails extends Penalty {
  user_name?: string;
  created_by_name?: string;
  resolved_by_name?: string;
}

export interface MonthlyIncentive {
  id: string;
  user_id: string;
  organization_id: string;
  month: string;
  gross_commission: number;
  streak_bonus: number;
  review_bonus: number;
  total_bonuses: number;
  penalty_count: number;
  penalty_percentage: number;
  penalty_amount: number;
  gross_total: number;
  net_incentive: number;
  user_monthly_salary: number | null;
  salary_cap_applied: boolean;
  capped_amount: number | null;
  final_approved_amount: number | null;
  status: IncentiveStatus;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  breakdown_json: IncentiveBreakdown | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyIncentiveWithDetails extends MonthlyIncentive {
  user_name?: string;
  reviewed_by_name?: string;
}

export interface TeamPoolDistribution {
  id: string;
  organization_id: string;
  month: string;
  total_pool_amount: number;
  top_performer_user_id: string | null;
  top_performer_amount: number | null;
  second_performer_user_id: string | null;
  second_performer_amount: number | null;
  third_performer_user_id: string | null;
  third_performer_amount: number | null;
  manager_user_id: string | null;
  manager_amount: number | null;
  support_staff_amount: number | null;
  others_pool_amount: number | null;
  status: TeamPoolStatus;
  approved_by: string | null;
  approved_at: string | null;
  distributed_at: string | null;
  distribution_notes: string | null;
  distribution_json: TeamPoolBreakdown | null;
  created_at: string;
  updated_at: string;
}

// Breakdown structures for detailed display
export interface IncentiveBreakdown {
  sales: SaleCommissionBreakdown[];
  streak: StreakBreakdown;
  reviews: ReviewBreakdown;
  penalties: PenaltyBreakdown[];
  summary: IncentiveSummary;
}

export interface SaleCommissionBreakdown {
  lead_id: string;
  invoice_no: string;
  customer_name: string;
  sale_price: number;
  category_name: string;
  commission_rate: number;
  multiplier_applied: boolean;
  commission_amount: number;
  review_qualified: boolean;
  created_at: string;
}

export interface StreakBreakdown {
  current_streak: number;
  bonus_tier: '7_days' | '14_days' | '30_days' | 'none';
  bonus_amount: number;
}

export interface ReviewBreakdown {
  reviews_initiated: number;
  bonus_per_review: number;
  total_bonus: number;
}

export interface PenaltyBreakdown {
  id: string;
  type: PenaltyType;
  percentage: number;
  description: string | null;
  incident_date: string | null;
}

export interface IncentiveSummary {
  gross_commission: number;
  streak_bonus: number;
  review_bonus: number;
  gross_total: number;
  total_penalty_percentage: number;
  penalty_amount: number;
  net_before_cap: number;
  salary_cap: number | null;
  cap_applied: boolean;
  final_amount: number;
}

export interface TeamPoolBreakdown {
  performers: {
    rank: number;
    user_id: string;
    user_name: string;
    total_sales: number;
    percentage: number;
    amount: number;
  }[];
  manager: {
    user_id: string;
    user_name: string;
    percentage: number;
    amount: number;
  } | null;
  support_staff: {
    user_id: string;
    user_name: string;
    amount: number;
  }[];
  others: {
    user_id: string;
    user_name: string;
    amount: number;
  }[];
}

// API request/response types
export interface CalculateIncentiveRequest {
  user_id?: string; // Optional, defaults to current user
  month?: string; // Optional, defaults to current month
}

export interface CreatePenaltyRequest {
  user_id: string;
  penalty_type: PenaltyType;
  description?: string;
  incident_date?: string;
  related_lead_id?: string;
}

export interface DisputePenaltyRequest {
  dispute_reason: string;
}

export interface ResolvePenaltyRequest {
  resolution: 'active' | 'waived';
  resolution_notes?: string;
}

export interface SetTargetRequest {
  user_id: string;
  month: string;
  target_amount: number;
}

export interface ApproveIncentiveRequest {
  incentive_id: string;
  approved: boolean;
  review_notes?: string;
  final_amount?: number;
}

export interface BulkApproveRequest {
  incentive_ids: string[];
  review_notes?: string;
}

// Penalty percentages based on 2XG Earn spec
export const PENALTY_PERCENTAGES: Record<PenaltyType, number> = {
  late_arrival: 5,
  unauthorized_absence: 10,
  back_to_back_offs: 10,
  low_compliance: 10, // Per point below 96%
  high_error_rate: 10, // Per point above 1%
  non_escalated_lost_lead: 10,
  missing_documentation: 10,
  low_team_eval: 15, // Per point below 4.0
  client_disrespect: 100, // Full forfeiture
};

// Streak bonus tiers
export const STREAK_BONUSES = {
  7: 50,
  14: 150,
  30: 700,
} as const;

// Team pool distribution percentages
export const TEAM_POOL_DISTRIBUTION = {
  top_performer: 20,
  second_performer: 12,
  third_performer: 8,
  manager: 20,
  support_staff: 20,
  others: 20,
} as const;

// Default monthly target (10 Lakhs)
export const DEFAULT_MONTHLY_TARGET = 1000000;

// ================================================
// ORGANIZATION INCENTIVE CONFIG (Per-Org Settings)
// ================================================

export interface OrganizationIncentiveConfig {
  id: string;
  organization_id: string;
  streak_bonus_7_days: number;
  streak_bonus_14_days: number;
  streak_bonus_30_days: number;
  review_bonus_per_review: number;
  penalty_late_arrival: number;
  penalty_unauthorized_absence: number;
  penalty_back_to_back_offs: number;
  penalty_low_compliance: number;
  penalty_high_error_rate: number;
  penalty_non_escalated_lost_lead: number;
  penalty_missing_documentation: number;
  penalty_low_team_eval: number;
  penalty_client_disrespect: number;
  compliance_threshold: number;
  error_rate_threshold: number;
  team_eval_threshold: number;
  team_pool_top_performer: number;
  team_pool_second_performer: number;
  team_pool_third_performer: number;
  team_pool_manager: number;
  team_pool_support_staff: number;
  team_pool_others: number;
  default_monthly_target: number;
  salary_cap_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

// Default config built from hardcoded constants (used as fallback)
export const DEFAULT_INCENTIVE_CONFIG: Omit<OrganizationIncentiveConfig, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  streak_bonus_7_days: STREAK_BONUSES[7],
  streak_bonus_14_days: STREAK_BONUSES[14],
  streak_bonus_30_days: STREAK_BONUSES[30],
  review_bonus_per_review: 10,
  penalty_late_arrival: PENALTY_PERCENTAGES.late_arrival,
  penalty_unauthorized_absence: PENALTY_PERCENTAGES.unauthorized_absence,
  penalty_back_to_back_offs: PENALTY_PERCENTAGES.back_to_back_offs,
  penalty_low_compliance: PENALTY_PERCENTAGES.low_compliance,
  penalty_high_error_rate: PENALTY_PERCENTAGES.high_error_rate,
  penalty_non_escalated_lost_lead: PENALTY_PERCENTAGES.non_escalated_lost_lead,
  penalty_missing_documentation: PENALTY_PERCENTAGES.missing_documentation,
  penalty_low_team_eval: PENALTY_PERCENTAGES.low_team_eval,
  penalty_client_disrespect: PENALTY_PERCENTAGES.client_disrespect,
  compliance_threshold: 96,
  error_rate_threshold: 1,
  team_eval_threshold: 4.0,
  team_pool_top_performer: TEAM_POOL_DISTRIBUTION.top_performer,
  team_pool_second_performer: TEAM_POOL_DISTRIBUTION.second_performer,
  team_pool_third_performer: TEAM_POOL_DISTRIBUTION.third_performer,
  team_pool_manager: TEAM_POOL_DISTRIBUTION.manager,
  team_pool_support_staff: TEAM_POOL_DISTRIBUTION.support_staff,
  team_pool_others: TEAM_POOL_DISTRIBUTION.others,
  default_monthly_target: DEFAULT_MONTHLY_TARGET,
  salary_cap_enabled: true,
};

// ================================================
// QR CODE OFFER SYSTEM TYPES (Spin Wheel)
// ================================================

// Offer Lead types for QR Code Customer Capture System
export interface OfferLead {
  id: string;
  organization_id: string;
  sales_rep_id: string;
  customer_name: string;
  phone: string;
  address?: string | null;
  locality?: string | null;
  prize_won?: string | null;
  coupon_code?: string | null;
  coupon_expires_at?: string | null;
  redeemed: boolean;
  redeemed_at?: string | null;
  converted_to_lead_id?: string | null;
  converted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpinPrize {
  label: string;
  probability: number;
  color: string;
  textColor?: string;
  disabled?: boolean; // If true, prize shows on wheel but won't be selected
}

export interface OfferFormData {
  name: string;
  phone: string;
  locality: string;
  address?: string;
}

export interface SpinResult {
  prize: string;
  couponCode: string;
  expiresAt: string;
}

// Bengaluru localities for address dropdown
export const BENGALURU_LOCALITIES = [
  'Koramangala',
  'Indiranagar',
  'Whitefield',
  'HSR Layout',
  'Jayanagar',
  'BTM Layout',
  'Electronic City',
  'Marathahalli',
  'Banashankari',
  'Malleshwaram',
  'JP Nagar',
  'Hebbal',
  'Yelahanka',
  'Rajajinagar',
  'Basavanagudi',
  'Bellandur',
  'Sarjapur',
  'Silk Board',
  'Bommanahalli',
  'Kengeri',
  'Other'
] as const;

export type BengaluruLocality = typeof BENGALURU_LOCALITIES[number];

// Spin wheel prize configuration
export const SPIN_PRIZES: SpinPrize[] = [
  { label: '₹500 OFF', probability: 0.10, color: '#FF6B6B', textColor: '#FFFFFF' },
  { label: '₹100 OFF', probability: 0.35, color: '#4ECDC4', textColor: '#FFFFFF' },
  { label: '15 Accessories + 1 Gift FREE', probability: 0.15, color: '#45B7D1', textColor: '#FFFFFF' },
  { label: '₹1000 OFF Next Purchase', probability: 0.05, color: '#96CEB4', textColor: '#FFFFFF' },
  { label: '₹200 OFF', probability: 0.20, color: '#FFEAA7', textColor: '#333333' },
  { label: 'Try Again', probability: 0.15, color: '#DFE6E9', textColor: '#333333' }
];
