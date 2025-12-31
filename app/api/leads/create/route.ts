import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
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

    // Find or create the model
    let modelId: string;

    // Check if model exists in the selected category
    const { data: existingModel, error: modelCheckError } = await supabaseAdmin
      .from('models')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('category_id', categoryId)
      .eq('name', modelName.trim())
      .maybeSingle();

    if (modelCheckError) {
      console.error('Error checking model:', modelCheckError);
      return NextResponse.json<APIResponse>(
        { success: false, error: `Model check failed: ${modelCheckError.message}` },
        { status: 500 }
      );
    }

    if (existingModel) {
      modelId = existingModel.id;
      console.log('Using existing model:', modelId);
    } else {
      // Create new model
      const { data: newModel, error: modelError } = await supabaseAdmin
        .from('models')
        .insert({
          organization_id: organizationId,
          category_id: categoryId,
          name: modelName.trim(),
        })
        .select('id')
        .maybeSingle();

      if (modelError || !newModel) {
        console.error('Error creating model:', modelError);
        return NextResponse.json<APIResponse>(
          { success: false, error: `Failed to create model: ${modelError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }

      modelId = newModel.id;
      console.log('Created new model:', modelId);
    }

    // Create lead - use upsert to avoid conflicts
    const leadData = {
      organization_id: organizationId,
      sales_rep_id: userId,
      customer_name: customerName.trim(),
      customer_phone: customerPhone,
      category_id: categoryId,
      model_id: modelId,
      deal_size: parseFloat(dealSize),
      purchase_timeline: purchaseTimeline,
      not_today_reason: purchaseTimeline !== 'today' ? notTodayReason : null,
    };

    console.log('Creating lead with data:', leadData);

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert(leadData)
      .select()
      .maybeSingle();

    if (error || !lead) {
      console.error('Error creating lead:', error);
      console.error('Lead data attempted:', leadData);
      return NextResponse.json<APIResponse>(
        { success: false, error: `Failed to create lead: ${error?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log('Lead created successfully:', lead.id);

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
