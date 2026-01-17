import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, SPIN_PRIZES, SpinResult, SpinPrize } from '@/lib/types';

// Generate a unique coupon code
function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'OFF';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Select prize based on weighted probability from the provided prizes array
// Excludes disabled prizes from selection (they still show on wheel but won't be selected)
function selectPrize(prizes: SpinPrize[]): { prize: string; index: number } {
  // Filter out disabled prizes
  const enabledPrizes = prizes.filter(p => !p.disabled);

  // If no enabled prizes, return first prize as fallback
  if (enabledPrizes.length === 0) {
    return { prize: prizes[0].label, index: 0 };
  }

  // Calculate total probability of enabled prizes
  const totalProb = enabledPrizes.reduce((sum, p) => sum + p.probability, 0);

  // Normalize probabilities and select
  const random = Math.random();
  let cumulative = 0;

  for (const prize of enabledPrizes) {
    const normalizedProb = prize.probability / totalProb;
    cumulative += normalizedProb;

    if (random < cumulative) {
      // Find original index in the full prizes array
      const originalIndex = prizes.findIndex(p => p.label === prize.label && p.color === prize.color);
      return { prize: prize.label, index: originalIndex };
    }
  }

  // Fallback to first enabled prize
  const firstEnabled = enabledPrizes[0];
  const originalIndex = prizes.findIndex(p => p.label === firstEnabled.label && p.color === firstEnabled.color);
  return { prize: firstEnabled.label, index: originalIndex };
}

// POST /api/offers/spin - Execute spin and return prize
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { offerLeadId } = body;

    if (!offerLeadId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Get the offer lead with customer details and sales rep info
    const { data: offerLead, error: fetchError } = await supabaseAdmin
      .from('offer_leads')
      .select('id, prize_won, coupon_code, phone, customer_name, locality, sales_rep_id, organization_id')
      .eq('id', offerLeadId)
      .maybeSingle();

    if (fetchError || !offerLead) {
      logger.error('Offer lead not found:', fetchError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid offer. Please start over.' },
        { status: 404 }
      );
    }

    // Check if already spun
    if (offerLead.prize_won && offerLead.coupon_code) {
      // Get org settings for WhatsApp number
      const { data: orgSettings } = await supabaseAdmin
        .from('organizations')
        .select('offer_whatsapp_number')
        .eq('id', offerLead.organization_id)
        .single();

      return NextResponse.json<APIResponse>({
        success: true,
        data: {
          prize: offerLead.prize_won,
          couponCode: offerLead.coupon_code,
          alreadySpun: true,
          customerName: offerLead.customer_name,
          customerPhone: offerLead.phone,
          locality: offerLead.locality,
          whatsappNumber: orgSettings?.offer_whatsapp_number || '',
        },
        message: 'You have already claimed your prize!',
      });
    }

    // Get organization's offer settings for prizes
    const { data: orgSettings, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('offer_prizes, offer_whatsapp_number, offer_enabled')
      .eq('id', offerLead.organization_id)
      .single();

    // Use org prizes if available, otherwise use defaults
    const prizes: SpinPrize[] = orgSettings?.offer_prizes && Array.isArray(orgSettings.offer_prizes) && orgSettings.offer_prizes.length > 0
      ? orgSettings.offer_prizes
      : SPIN_PRIZES;

    // Select prize based on probability
    const { prize, index } = selectPrize(prizes);
    const isTryAgain = prize === 'Try Again' || prize.toLowerCase().includes('try again');

    // Generate coupon code (only for actual prizes)
    const couponCode = isTryAgain ? null : generateCouponCode();
    const expiresAt = isTryAgain
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    // Update the offer lead with prize
    const { error: updateError } = await supabaseAdmin
      .from('offer_leads')
      .update({
        prize_won: prize,
        coupon_code: couponCode,
        coupon_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerLeadId);

    if (updateError) {
      logger.error('Error updating offer lead with prize:', updateError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to record your prize. Please try again.' },
        { status: 500 }
      );
    }

    logger.info(`Prize awarded: ${prize} to offer lead ${offerLeadId}`);

    return NextResponse.json<APIResponse<SpinResult & {
      prizeIndex: number;
      isTryAgain: boolean;
      customerName: string;
      customerPhone: string;
      locality: string | null;
      whatsappNumber: string;
    }>>(
      {
        success: true,
        data: {
          prize,
          couponCode: couponCode || '',
          expiresAt: expiresAt || '',
          prizeIndex: index,
          isTryAgain,
          customerName: offerLead.customer_name,
          customerPhone: offerLead.phone,
          locality: offerLead.locality,
          whatsappNumber: orgSettings?.offer_whatsapp_number || '',
        },
        message: isTryAgain ? 'Better luck next time!' : 'Congratulations! You won!',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Spin error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
