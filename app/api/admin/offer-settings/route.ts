import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, SpinPrize } from '@/lib/types';

// GET /api/admin/offer-settings - Get offer/QR settings
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .select('offer_whatsapp_number, offer_prizes, offer_enabled')
      .eq('id', organizationId)
      .single();

    if (error) {
      logger.error('Error fetching offer settings:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch offer settings' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        whatsappNumber: organization?.offer_whatsapp_number || '',
        prizes: organization?.offer_prizes || [],
        enabled: organization?.offer_enabled ?? true,
      },
    });
  } catch (error) {
    logger.error('Get offer settings error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/offer-settings - Update offer/QR settings
export async function PUT(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userRole = request.headers.get('x-user-role');

    if (!organizationId || (userRole !== 'admin' && userRole !== 'manager')) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { whatsappNumber, prizes, enabled } = body;

    const updateData: Record<string, any> = {};

    // Validate and set WhatsApp number
    if (whatsappNumber !== undefined) {
      // Remove any non-digit characters and validate
      const cleanNumber = whatsappNumber.replace(/\D/g, '');
      if (cleanNumber && cleanNumber.length < 10) {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Invalid WhatsApp number' },
          { status: 400 }
        );
      }
      updateData.offer_whatsapp_number = cleanNumber || null;
    }

    // Validate and set prizes
    if (prizes !== undefined) {
      if (!Array.isArray(prizes)) {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Prizes must be an array' },
          { status: 400 }
        );
      }

      // Validate prize structure
      let totalProbability = 0;
      for (const prize of prizes) {
        if (!prize.label || typeof prize.label !== 'string') {
          return NextResponse.json<APIResponse>(
            { success: false, error: 'Each prize must have a label' },
            { status: 400 }
          );
        }
        if (typeof prize.probability !== 'number' || prize.probability < 0 || prize.probability > 1) {
          return NextResponse.json<APIResponse>(
            { success: false, error: 'Each prize probability must be between 0 and 1' },
            { status: 400 }
          );
        }
        if (!prize.color || typeof prize.color !== 'string') {
          return NextResponse.json<APIResponse>(
            { success: false, error: 'Each prize must have a color' },
            { status: 400 }
          );
        }
        totalProbability += prize.probability;
      }

      // Total probability should be approximately 1 (allowing small floating point errors)
      if (Math.abs(totalProbability - 1) > 0.01) {
        return NextResponse.json<APIResponse>(
          { success: false, error: `Total probability must equal 100% (currently ${(totalProbability * 100).toFixed(1)}%)` },
          { status: 400 }
        );
      }

      updateData.offer_prizes = prizes;
    }

    // Set enabled flag
    if (enabled !== undefined) {
      updateData.offer_enabled = !!enabled;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select('offer_whatsapp_number, offer_prizes, offer_enabled')
      .single();

    if (error) {
      logger.error('Error updating offer settings:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to update offer settings' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Offer settings updated successfully',
      data: {
        whatsappNumber: organization?.offer_whatsapp_number || '',
        prizes: organization?.offer_prizes || [],
        enabled: organization?.offer_enabled ?? true,
      },
    });
  } catch (error) {
    logger.error('Update offer settings error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
