import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, OfferLead } from '@/lib/types';

// GET /api/offers/validate/[code] - Validate coupon at POS
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length < 6) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid coupon code' },
        { status: 400 }
      );
    }

    // Get auth headers for organization check
    const organizationId = request.headers.get('x-organization-id');

    // Find the coupon
    const { data: offerLead, error } = await supabaseAdmin
      .from('offer_leads')
      .select('*')
      .eq('coupon_code', code.toUpperCase())
      .maybeSingle();

    if (error || !offerLead) {
      logger.info('Coupon not found:', code);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Check if coupon belongs to same organization (if auth headers present)
    if (organizationId && offerLead.organization_id !== organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Coupon not valid for this store' },
        { status: 403 }
      );
    }

    // Check if already redeemed
    if (offerLead.redeemed) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: 'Coupon already redeemed',
        data: {
          redeemedAt: offerLead.redeemed_at,
        },
      });
    }

    // Check if expired
    if (offerLead.coupon_expires_at && new Date(offerLead.coupon_expires_at) < new Date()) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: 'Coupon has expired',
        data: {
          expiredAt: offerLead.coupon_expires_at,
        },
      });
    }

    // Valid coupon
    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        valid: true,
        customerName: offerLead.customer_name,
        phone: offerLead.phone,
        prize: offerLead.prize_won,
        couponCode: offerLead.coupon_code,
        expiresAt: offerLead.coupon_expires_at,
        locality: offerLead.locality,
      },
      message: 'Coupon is valid',
    });
  } catch (error) {
    logger.error('Coupon validation error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}

// PATCH /api/offers/validate/[code] - Redeem coupon
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const organizationId = request.headers.get('x-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the coupon
    const { data: offerLead, error: fetchError } = await supabaseAdmin
      .from('offer_leads')
      .select('*')
      .eq('coupon_code', code.toUpperCase())
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (fetchError || !offerLead) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    if (offerLead.redeemed) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Coupon already redeemed' },
        { status: 400 }
      );
    }

    if (offerLead.coupon_expires_at && new Date(offerLead.coupon_expires_at) < new Date()) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Coupon has expired' },
        { status: 400 }
      );
    }

    // Redeem the coupon
    const { error: updateError } = await supabaseAdmin
      .from('offer_leads')
      .update({
        redeemed: true,
        redeemed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerLead.id);

    if (updateError) {
      logger.error('Error redeeming coupon:', updateError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to redeem coupon' },
        { status: 500 }
      );
    }

    logger.info(`Coupon redeemed: ${code} by user ${userId}`);

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        redeemed: true,
        customerName: offerLead.customer_name,
        prize: offerLead.prize_won,
      },
      message: 'Coupon redeemed successfully!',
    });
  } catch (error) {
    logger.error('Coupon redemption error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Failed to redeem coupon' },
      { status: 500 }
    );
  }
}
