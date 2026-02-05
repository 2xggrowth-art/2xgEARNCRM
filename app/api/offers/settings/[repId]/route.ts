import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, SpinPrize, SPIN_PRIZES } from '@/lib/types';

// GET /api/offers/settings/[repId] - Get offer settings for a sales rep's organization (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ repId: string }> }
) {
  try {
    const { repId } = await params;

    if (!repId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Get the sales rep's organization
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('id', repId)
      .maybeSingle();

    if (userError || !user) {
      logger.error('User not found:', userError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid sales rep' },
        { status: 404 }
      );
    }

    // Get organization's offer settings
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('offer_whatsapp_number, offer_prizes, offer_enabled')
      .eq('id', user.organization_id)
      .single();

    if (orgError) {
      logger.error('Error fetching organization offer settings:', orgError);
      // Return default values if settings don't exist
      return NextResponse.json<APIResponse>({
        success: true,
        data: {
          whatsappNumber: '',
          prizes: SPIN_PRIZES,
          enabled: true,
        },
      });
    }

    // Use defaults if columns don't exist (migration not run yet)
    const prizes: SpinPrize[] = organization?.offer_prizes || SPIN_PRIZES;
    const whatsappNumber = organization?.offer_whatsapp_number || '';
    const enabled = organization?.offer_enabled ?? true;

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        whatsappNumber,
        prizes,
        enabled,
      },
    });
  } catch (error) {
    logger.error('Get public offer settings error:', error);
    // Return defaults on any error
    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        whatsappNumber: '',
        prizes: SPIN_PRIZES,
        enabled: true,
      },
    });
  }
}
