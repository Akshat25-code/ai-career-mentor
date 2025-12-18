const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars from the server root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const runSchema = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is not defined in .env file');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for many cloud providers like Neon/Render
    }
  });

  try {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Reading schema.sql...');
    console.log('🚀 Executing schema...');
    
    await pool.query(schemaSql);
    
    console.log('✅ Database initialized successfully!');
    console.log('   - Created table: users');
    console.log('   - Created table: onboarding_data');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
  } finally {
    await pool.end();
  }
};

runSchema();
