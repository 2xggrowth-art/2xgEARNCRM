import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';


export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, error: 'No User ID' }, { status: 401 });

    // Simplified query: No joins, just raw lead data
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('id, customer_name, customer_phone, invoice_no, sale_price, incentive_amount, review_status')
      .eq('sales_rep_id', userId)
      .eq('status', 'win')
      .eq('review_status', 'reviewed');

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('API Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}