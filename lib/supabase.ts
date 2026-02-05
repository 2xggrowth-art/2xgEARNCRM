// Database client - re-exports from db.ts for backward compatibility
// All API routes import supabaseAdmin from this file
import { db } from './db';

// Both exports point to the same direct PostgreSQL client
export const supabaseAdmin = db;
export const supabase = db;
