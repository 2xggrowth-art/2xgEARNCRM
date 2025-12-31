import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';
import { getDevOrganizationId, getDevUserId } from '@/lib/dev-helpers';

export async function POST(request: NextRequest) {
  try {
    // For development: get organization and user ID from database
    const organizationId = await getDevOrganizationId();
    const userId = await getDevUserId();

    if (!organizationId || !userId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'No organization or user found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      customerName,
      customerPhone,
      categoryId,
      dealSize,
      modelName,
      purchaseTimeline,
      notTodayReason,
    } = body;

    // Validation
    if (!customerName || customerName.trim().length < 2) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Customer name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!customerPhone || !/^[0-9]{10}$/.test(customerPhone)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Category is required' },
        { status: 400 }
      );
    }

    if (!dealSize || isNaN(parseFloat(dealSize)) || parseFloat(dealSize) < 1) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid deal size' },
        { status: 400 }
      );
    }

    if (!modelName || modelName.trim().length < 2) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Model name must be at least 2 characters' },
        { status: 400 }
      );
    }

    const validTimelines = ['today', '3_days', '7_days', '30_days'];
    if (!purchaseTimeline || !validTimelines.includes(purchaseTimeline)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid purchase timeline' },
        { status: 400 }
      );
    }

    // Create lead
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert({
        organization_id: organizationId,
        sales_rep_id: userId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone,
        category_id: categoryId,
        deal_size: parseFloat(dealSize),
        model_name: modelName.trim(),
        purchase_timeline: purchaseTimeline,
        not_today_reason: purchaseTimeline !== 'today' ? notTodayReason : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to create lead' },
        { status: 500 }
      );
    }

    // Trigger WhatsApp message in background (don't wait for it)
    fetch(`${request.nextUrl.origin}/api/whatsapp/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': organizationId,
      },
      body: JSON.stringify({ leadId: lead.id }),
    }).catch((err) => {
      console.error('WhatsApp trigger failed:', err);
      // Don't fail the lead creation if WhatsApp fails
    });

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Lead created successfully',
      data: lead,
    });
  } catch (error) {
    console.error('Create lead error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
