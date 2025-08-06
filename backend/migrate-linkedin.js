// migrate-linkedin.js - One-time migration script to add LinkedIn columns
require('dotenv').config();
const { Client } = require('pg');

async function migrateDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔗 Connecting to PostgreSQL database...');
    await client.connect();
    
    console.log('🔧 Adding LinkedIn columns to Users table...');
    
    const alterTableQuery = `
      ALTER TABLE "Users" 
      ADD COLUMN IF NOT EXISTS "linkedinAccessToken" TEXT,
      ADD COLUMN IF NOT EXISTS "linkedinRefreshToken" TEXT,
      ADD COLUMN IF NOT EXISTS "linkedinProfile" TEXT,
      ADD COLUMN IF NOT EXISTS "linkedinTokenExpiry" TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS "linkedinConnected" BOOLEAN DEFAULT false;
    `;
    
    await client.query(alterTableQuery);
    
    console.log('✅ LinkedIn columns added successfully!');
    console.log('📊 Verifying table structure...');
    
    // Verify the columns were added
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Users' 
      AND column_name LIKE 'linkedin%'
      ORDER BY column_name;
    `;
    
    const result = await client.query(verifyQuery);
    
    if (result.rows.length > 0) {
      console.log('✅ LinkedIn columns verified:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('⚠️  No LinkedIn columns found - migration may have failed');
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    
    if (error.message.includes('column') && error.message.includes('already exists')) {
      console.log('✅ Columns already exist - no migration needed!');
    } else {
      console.error('Full error:', error);
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

console.log('🚀 Starting LinkedIn database migration...');
migrateDatabase();
