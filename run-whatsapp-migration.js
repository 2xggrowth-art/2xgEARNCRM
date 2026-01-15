const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🔄 Running WhatsApp multi-provider migration...');
    console.log('Connected to:', supabaseUrl);

    // Read the migration SQL file
    const sqlFile = 'migrations/add-multi-provider-whatsapp.sql';
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Test connection first
    console.log('Testing connection...');
    const { error: testError } = await supabase.from('organizations').select('id').limit(1);

    if (testError) {
      console.error('❌ Connection test failed:', testError);
      console.log('\n⚠️  Please run the SQL manually in Supabase SQL Editor');
      process.exit(1);
    }

    console.log('✅ Connection successful!');
    console.log('\n📋 SQL to run in Supabase SQL Editor:');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    console.log('\n🔗 Steps to apply the migration:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Navigate to SQL Editor (left sidebar)');
    console.log('4. Click "+ New query"');
    console.log('5. Copy and paste the SQL shown above');
    console.log('6. Click "Run" to execute');
    console.log('\nAfter running the SQL, the multi-provider WhatsApp support will be active! ✅');

  } catch (error) {
    console.error('❌ Migration setup failed:', error);
    process.exit(1);
  }
}

runMigration();
