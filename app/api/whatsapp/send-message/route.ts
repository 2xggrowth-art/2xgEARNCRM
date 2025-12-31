import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Fetch lead with organization details
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        organizations (*),
        categories (name)
      `)
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Lead not found:', leadError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    const organization = lead.organizations;

    // Check if WhatsApp is configured
    if (
      !organization.whatsapp_phone_number_id ||
      !organization.whatsapp_access_token
    ) {
      console.log('WhatsApp not configured for organization');
      return NextResponse.json<APIResponse>({
        success: false,
        error: 'WhatsApp not configured',
      });
    }

    // Prepare WhatsApp API call
    const url = `https://graph.facebook.com/v18.0/${organization.whatsapp_phone_number_id}/messages`;

    const categoryName = lead.categories?.name || 'our product';
    const contactNumber = organization.contact_number || 'us';

    // Meta WhatsApp Cloud API request
    const whatsappResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${organization.whatsapp_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: lead.customer_phone,
        type: 'template',
        template: {
          name: 'lead_followup', // You need to create this template in Meta Business Manager
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: categoryName },
                { type: 'text', text: lead.model_name },
                { type: 'text', text: lead.deal_size.toString() },
                { type: 'text', text: contactNumber },
              ],
            },
          ],
        },
      }),
    });

    const whatsappData = await whatsappResponse.json();

    // Log WhatsApp API response
    await supabaseAdmin.from('whatsapp_logs').insert({
      lead_id: leadId,
      phone_number: lead.customer_phone,
      status: whatsappResponse.ok ? 'success' : 'failed',
      response_data: whatsappData,
      error_message: whatsappResponse.ok ? null : JSON.stringify(whatsappData),
    });

    if (!whatsappResponse.ok) {
      console.error('WhatsApp API error:', whatsappData);
      return NextResponse.json<APIResponse>({
        success: false,
        error: 'Failed to send WhatsApp message',
        data: whatsappData,
      });
    }

    // Update lead with WhatsApp sent status
    await supabaseAdmin
      .from('leads')
      .update({
        whatsapp_sent: true,
        whatsapp_sent_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'WhatsApp message sent successfully',
      data: whatsappData,
    });
  } catch (error) {
    console.error('Send WhatsApp message error:', error);

    // Log error
    try {
      await supabaseAdmin.from('whatsapp_logs').insert({
        lead_id: request.body ? JSON.parse(await request.text()).leadId : null,
        phone_number: 'unknown',
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('Failed to log WhatsApp error:', logError);
    }

    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
