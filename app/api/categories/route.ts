import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';
import { getDevOrganizationId } from '@/lib/dev-helpers';

export async function GET(request: NextRequest) {
  try {
    // For development: get organization ID from database
    const organizationId = await getDevOrganizationId();

    if (!organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'No organization found' },
        { status: 404 }
      );
    }

    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // For development: get organization ID from database
    const organizationId = await getDevOrganizationId();

    if (!organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'No organization found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Category name must be at least 2 characters' },
        { status: 400 }
      );
    }

    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .insert({
        organization_id: organizationId,
        name: name.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to create category' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
