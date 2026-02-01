import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { pool } from '@/lib/db';
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
    logger.info('Creating lead with direct SQL...');

    const modelResult = await pool.query(
      `WITH model_insert AS (
        INSERT INTO models (organization_id, category_id, name)
        VALUES ($1, $2, $3)
        ON CONFLICT (category_id, name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      )
      SELECT id FROM model_insert`,
      [organizationId, categoryId, modelName.trim()]
    );

    const modelId = modelResult.rows[0]?.id;

    if (!modelId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to create or find model' },
        { status: 500 }
      );
    }

    // Create the lead
    const leadResult = await pool.query(
      `INSERT INTO leads (
        organization_id, sales_rep_id, customer_name, customer_phone,
        status, category_id, model_id, deal_size, purchase_timeline, not_today_reason
      )
      VALUES ($1, $2, $3, $4, 'lost', $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        organizationId,
        userId,
        customerName.trim(),
        customerPhone,
        categoryId,
        modelId,
        parseFloat(dealSize),
        purchaseTimeline,
        purchaseTimeline !== 'today' ? notTodayReason : null,
      ]
    );

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Lead created successfully',
      data: leadResult.rows[0],
    });

  } catch (error) {
    logger.error('Create lead error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
