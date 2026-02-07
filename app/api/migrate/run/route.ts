import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

/**
 * POST /api/migrate/run
 * Run database migration to add missing columns for 2XG EARN incentive system
 * Requires: super_admin role OR MIGRATION_SECRET header
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication: Check for super_admin role or migration secret
    const userRole = request.headers.get('x-user-role');
    const migrationSecret = request.headers.get('x-migration-secret');
    const expectedSecret = process.env.MIGRATION_SECRET || process.env.JWT_SECRET;

    const isAuthorized =
      userRole === 'super_admin' ||
      (migrationSecret && migrationSecret === expectedSecret);

    if (!isAuthorized) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized. Requires super_admin role or valid migration secret.',
      }, { status: 401 });
    }

    console.log('Running 2XG EARN migration...');

    // Require DATABASE_URL - no hardcoded fallback
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL environment variable is not set',
      }, { status: 500 });
    }

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
    let failureCount = 0;

    for (const sql of migrations) {
      try {
        await pool.query(sql);
        const colName = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        results.push(`✓ ${colName}: Added successfully`);
      } catch (e: any) {
        const colName = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        results.push(`✗ ${colName}: ${e.message}`);
        failureCount++;
      }
    }

    // Close connection
    await pool.end();

    console.log('Migration completed!');

    const allSucceeded = failureCount === 0;

    return NextResponse.json({
      success: allSucceeded,
      message: allSucceeded
        ? 'Migration completed! All columns added to leads table.'
        : `Migration completed with ${failureCount} error(s).`,
      results,
    }, { status: allSucceeded ? 200 : 207 });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      hint: 'Make sure DATABASE_URL is set in environment variables',
    }, { status: 500 });
  }
}

// Also support GET for backward compatibility, but with same auth
export async function GET(request: NextRequest) {
  return POST(request);
}
