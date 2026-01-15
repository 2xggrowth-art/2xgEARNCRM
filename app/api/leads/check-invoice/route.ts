import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  exists?: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { invoiceNo } = await request.json();

    // Get organization ID from headers (injected by proxy)
    const organizationId = request.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Missing organization ID' },
        { status: 401 }
      );
    }

    if (!invoiceNo || invoiceNo.trim().length < 3) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invoice number must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Check if invoice exists for this organization
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('invoice_no', invoiceNo.trim())
      .maybeSingle();

    if (error) {
      logger.error('Error checking invoice:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      exists: !!data,
    });
  } catch (error) {
    logger.error('Check invoice error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
