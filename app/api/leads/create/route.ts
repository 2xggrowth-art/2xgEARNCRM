import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, LeadStatus } from '@/lib/types';

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
      status, // 'win' or 'lost'
      // Win-specific fields
      invoiceNo,
      salePrice,
      // Lost-specific fields
      dealSize,
      modelName,
      purchaseTimeline,
      notTodayReason,
      otherReason, // Custom reason text when notTodayReason is 'other'
      leadRating, // 5-star rating (1-5)
    } = body;

    console.log('Creating lead with status:', status);

    // Common validation
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

    if (!status || !['win', 'lost'].includes(status)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    let leadData: any = {
      organization_id: organizationId,
      sales_rep_id: userId,
      customer_name: customerName.trim(),
      customer_phone: customerPhone,
      category_id: categoryId,
      status: status as LeadStatus,
    };

    // WIN FLOW VALIDATION & DATA
    if (status === 'win') {
      // Validate Win-specific fields
      if (!invoiceNo || invoiceNo.trim().length < 3) {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Invoice number must be at least 3 characters' },
          { status: 400 }
        );
      }

      if (!/^[a-zA-Z0-9]+$/.test(invoiceNo.trim())) {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Invoice number must be alphanumeric' },
          { status: 400 }
        );
      }

      if (!salePrice || isNaN(parseFloat(salePrice))) {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Invalid sale price' },
          { status: 400 }
        );
      }

      const price = parseFloat(salePrice);
      if (price < 500 || price > 500000) {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Sale price must be between ₹500 and ₹5,00,000' },
          { status: 400 }
        );
      }

      // Check invoice uniqueness
      const { data: existingInvoice } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('invoice_no', invoiceNo.trim())
        .maybeSingle();

      if (existingInvoice) {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Invoice number already exists' },
          { status: 409 }
        );
      }

      leadData = {
        ...leadData,
        invoice_no: invoiceNo.trim(),
        sale_price: price,
        // Set Lost fields to null for Win leads
        deal_size: null,
        model_id: null,
        purchase_timeline: null,
        not_today_reason: null,
      };

      console.log('Creating Win lead:', leadData);
    }

    // LOST FLOW VALIDATION & DATA
    if (status === 'lost') {
      // Validate Lost-specific fields
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
            {
              success: false,
              error: `Failed to create model: ${modelError?.message || 'Unknown error'}`,
            },
            { status: 500 }
          );
        }

        modelId = newModel.id;
        console.log('Created new model:', modelId);
      }

      leadData = {
        ...leadData,
        deal_size: parseFloat(dealSize),
        model_id: modelId,
        purchase_timeline: purchaseTimeline,
        not_today_reason: purchaseTimeline !== 'today' ? notTodayReason : null,
        other_reason: notTodayReason === 'other' && otherReason ? otherReason.trim() : null,
        lead_rating: purchaseTimeline !== 'today' && leadRating ? parseInt(leadRating) : null,
        // Set Win fields to null for Lost leads
        invoice_no: null,
        sale_price: null,
      };

      console.log('Creating Lost lead:', leadData);
    }

    // Create the lead
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

    return NextResponse.json<APIResponse>(
      {
        success: true,
        data: lead,
        message: status === 'win' ? 'Sale completed successfully!' : 'Lead created successfully!',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create lead error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
