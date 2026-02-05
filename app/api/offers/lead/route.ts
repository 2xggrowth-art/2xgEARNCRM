import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, OfferLead } from '@/lib/types';

// POST /api/offers/lead - Submit customer data from offer page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, locality, address, salesRepId } = body;

    // Validate required fields
    if (!name || name.trim().length < 2) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Please enter a valid 10-digit mobile number' },
        { status: 400 }
      );
    }

    if (!locality || locality.trim().length < 2) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Please select your locality' },
        { status: 400 }
      );
    }

    if (!salesRepId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid offer link' },
        { status: 400 }
      );
    }

    // Verify sales rep exists and get their organization
    const { data: salesRep, error: repError } = await supabaseAdmin
      .from('users')
      .select('id, organization_id, name')
      .eq('id', salesRepId)
      .maybeSingle();

    if (repError || !salesRep) {
      logger.error('Sales rep not found:', repError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid offer link' },
        { status: 400 }
      );
    }

    // Check if phone already exists for this organization
    const { data: existingLead } = await supabaseAdmin
      .from('offer_leads')
      .select('id, prize_won, coupon_code')
      .eq('phone', phone)
      .eq('organization_id', salesRep.organization_id)
      .maybeSingle();

    if (existingLead) {
      // If they already have a prize, return it
      if (existingLead.prize_won && existingLead.coupon_code) {
        return NextResponse.json<APIResponse>({
          success: true,
          data: {
            id: existingLead.id,
            alreadyPlayed: true,
            prize: existingLead.prize_won,
            couponCode: existingLead.coupon_code,
          },
          message: 'You have already claimed your offer!',
        });
      }

      // They submitted data but haven't spun yet
      return NextResponse.json<APIResponse>({
        success: true,
        data: {
          id: existingLead.id,
          alreadySubmitted: true,
        },
        message: 'Data already submitted. Ready to spin!',
      });
    }

    // Create new offer lead
    const { data: offerLead, error } = await supabaseAdmin
      .from('offer_leads')
      .insert({
        organization_id: salesRep.organization_id,
        sales_rep_id: salesRepId,
        customer_name: name.trim(),
        phone: phone,
        locality: locality.trim(),
        address: address?.trim() || null,
      })
      .select()
      .single();

    if (error || !offerLead) {
      logger.error('Error creating offer lead:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to save your details. Please try again.' },
        { status: 500 }
      );
    }

    logger.info('Offer lead created:', offerLead.id);

    return NextResponse.json<APIResponse<{ id: string }>>(
      {
        success: true,
        data: { id: offerLead.id },
        message: 'Details saved successfully!',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Offer lead creation error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
