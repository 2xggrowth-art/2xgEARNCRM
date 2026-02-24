import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlLength: process.env.DATABASE_URL?.length || 0,
      dbUrlStart: process.env.DATABASE_URL?.substring(0, 30) || 'NOT SET',
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
    },
  };

  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as db');
    diagnostics.db = {
      connected: true,
      time: result.rows[0]?.time,
      database: result.rows[0]?.db,
    };

    // Check if users table exists and has data
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    diagnostics.users = {
      count: parseInt(usersResult.rows[0]?.count || '0', 10),
    };

    // Check for specific phone
    const phoneResult = await pool.query(
      "SELECT id, phone, name, role, pin_hash IS NOT NULL as has_pin FROM users WHERE phone = $1",
      ['8888888888']
    );
    diagnostics.testUser = phoneResult.rows[0] || 'NOT FOUND';
  } catch (error: unknown) {
    const err = error as Error;
    diagnostics.db = {
      connected: false,
      error: err.message,
      stack: err.stack?.substring(0, 200),
    };
  }

  return NextResponse.json(diagnostics);
}
