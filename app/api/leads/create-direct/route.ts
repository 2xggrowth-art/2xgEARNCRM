import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
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

    // Use raw SQL to bypass PostgREST schema cache issues
    logger.info('Creating lead with raw SQL...');

    // First, find or create the model using raw SQL
    const { data: modelResult, error: modelCheckError } = await supabaseAdmin.rpc(
      'exec_sql',
      {
        sql: `
          WITH model_insert AS (
            INSERT INTO models (organization_id, category_id, name)
            VALUES ($1, $2, $3)
            ON CONFLICT (category_id, name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
          )
          SELECT id FROM model_insert;
        `,
        params: [organizationId, categoryId, modelName.trim()],
      }
    );

    if (modelCheckError) {
      logger.error('Error with model SQL:', modelCheckError);

      // Fallback: Try using the ORM method
      const { data: existingModel } = await supabaseAdmin
        .from('models')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('category_id', categoryId)
        .eq('name', modelName.trim())
        .single();

      let modelId: string;

      if (existingModel) {
        modelId = existingModel.id;
      } else {
        const { data: newModel, error: modelError } = await supabaseAdmin
          .from('models')
          .insert({
            organization_id: organizationId,
            category_id: categoryId,
            name: modelName.trim(),
          })
          .select('id')
          .single();

        if (modelError) {
          logger.error('Error creating model:', modelError);
          return NextResponse.json<APIResponse>(
            { success: false, error: 'Failed to create model' },
            { status: 500 }
          );
        }

        modelId = newModel.id;
      }

      // Create lead with the model ID
      const { data: lead, error: leadError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          INSERT INTO leads (
            organization_id,
            sales_rep_id,
            customer_name,
            customer_phone,
            category_id,
            model_id,
            deal_size,
            purchase_timeline,
            not_today_reason
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *;
        `,
        params: [
          organizationId,
          userId,
          customerName.trim(),
          customerPhone,
          categoryId,
          modelId,
          parseFloat(dealSize),
          purchaseTimeline,
          purchaseTimeline !== 'today' ? notTodayReason : null,
        ],
      });

      if (leadError) {
        logger.error('Error creating lead with SQL:', leadError);
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Failed to create lead' },
          { status: 500 }
        );
      }

      return NextResponse.json<APIResponse>({
        success: true,
        message: 'Lead created successfully',
        data: lead,
      });
    }

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Lead creation in progress',
    });

  } catch (error) {
    logger.error('Create lead error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
