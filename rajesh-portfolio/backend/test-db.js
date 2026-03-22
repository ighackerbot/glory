const { Pool } = require('pg');
require('dotenv').config();

const urls = [
  { name: 'Original', url: process.env.DATABASE_URL },
  { name: 'Pooler 6543', url: `postgresql://postgres.cxcxgoxyvggeinajqfku:Ki5258OBxsNA5uss@aws-0-ap-south-1.pooler.supabase.com:6543/postgres` },
  { name: 'Pooler 5432', url: `postgresql://postgres.cxcxgoxyvggeinajqfku:Ki5258OBxsNA5uss@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` },
  { name: 'US-East Pooler', url: `postgresql://postgres.cxcxgoxyvggeinajqfku:Ki5258OBxsNA5uss@aws-0-us-east-1.pooler.supabase.com:6543/postgres` },
];

async function testConnections() {
  for (const { name, url } of urls) {
    console.log(`\n[${name}] Trying...`);
    const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as time');
      console.log(`✅ SUCCESS! Connected at ${result.rows[0].time}`);
      console.log(`   Working URL: ${url}`);
      client.release();
      await pool.end();
      return;
    } catch (err) {
      console.log(`❌ Failed: ${err.message}`);
      await pool.end();
    }
  }
  console.log('\nAll connection attempts failed.');
}

testConnections();
