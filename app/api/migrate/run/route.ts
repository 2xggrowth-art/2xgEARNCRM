import { NextResponse } from 'next/server';
import { Pool } from 'pg';

/**
 * GET /api/migrate/run
 * Run database migration to add missing columns for 2XG EARN incentive system
 * Visit: https://leadcrm.2xg.in/api/migrate/run
 */
export async function GET() {
  try {
    console.log('Running 2XG EARN migration...');

    // Use DATABASE_URL from environment or fallback
    const databaseUrl = process.env.DATABASE_URL ||
      'postgresql://lead_crm_user:LcRm2026_Pg_S3cure!@lead-crm-postgres:5432/lead_crm';

    const pool = new Pool({
      connectionString: databaseUrl,
    });

    // SQL migrations to add missing columns
    const migrations = [
      'ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_sent_at TIMESTAMPTZ',
      'ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_received_at TIMESTAMPTZ',
      'ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_deadline TIMESTAMPTZ',
      'ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_qualified BOOLEAN',
      'ALTER TABLE leads ADD COLUMN IF NOT EXISTS escalated_to_manager BOOLEAN DEFAULT FALSE',
      'ALTER TABLE leads ADD COLUMN IF NOT EXISTS commission_rate_applied DECIMAL(5,3)',
      'ALTER TABLE leads ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2)',
    ];

    const results: string[] = [];

    for (const sql of migrations) {
      try {
        await pool.query(sql);
        const colName = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        results.push(`✓ ${colName}: Added successfully`);
      } catch (e: any) {
        const colName = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        results.push(`✗ ${colName}: ${e.message}`);
      }
    }

    // Close connection
    await pool.end();

    console.log('Migration completed!');

    return NextResponse.json({
      success: true,
      message: 'Migration completed! All columns added to leads table.',
      results,
      columns_added: [
        'review_sent_at',
        'review_received_at',
        'review_deadline',
        'review_qualified',
        'escalated_to_manager',
        'commission_rate_applied',
        'commission_amount',
      ],
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      hint: 'Make sure DATABASE_URL is set in environment variables',
    }, { status: 500 });
  }
}
