// Migration script — creates tables via Supabase SQL endpoint
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SQL_STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
  
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'subscriber' CHECK (role IN ('subscriber', 'admin')),
    selected_charity_id UUID,
    charity_contribution_pct NUMERIC(5,2) DEFAULT 10.00 CHECK (charity_contribution_pct >= 10),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'lapsed', 'expired')),
    price NUMERIC(10,2) NOT NULL,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    renewal_date TIMESTAMPTZ NOT NULL,
    cancelled_at TIMESTAMPTZ,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
    played_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS charities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    focus VARCHAR(255),
    highlight TEXT,
    image_url TEXT,
    website_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    upcoming_events TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS draws (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    draw_month VARCHAR(7) NOT NULL,
    draw_type VARCHAR(20) DEFAULT 'random' CHECK (draw_type IN ('random', 'algorithmic')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'simulated', 'executed', 'published')),
    total_prize_pool NUMERIC(12,2) DEFAULT 0,
    jackpot_rollover NUMERIC(12,2) DEFAULT 0,
    executed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS draw_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scores INTEGER[] NOT NULL,
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(draw_id, user_id)
  )`,

  `CREATE TABLE IF NOT EXISTS draw_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_id UUID NOT NULL REFERENCES draw_entries(id) ON DELETE CASCADE,
    match_tier VARCHAR(20) NOT NULL CHECK (match_tier IN ('5-match', '4-match', '3-match')),
    matched_numbers INTEGER[] NOT NULL,
    prize_amount NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS winner_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_result_id UUID NOT NULL REFERENCES draw_results(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proof_image_url TEXT,
    proof_uploaded_at TIMESTAMPTZ,
    admin_review_status VARCHAR(20) DEFAULT 'pending' CHECK (admin_review_status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS prize_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id UUID REFERENCES draws(id) ON DELETE CASCADE,
    pool_month VARCHAR(7) NOT NULL,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    total_pool NUMERIC(12,2) DEFAULT 0,
    charity_total NUMERIC(12,2) DEFAULT 0,
    five_match_pool NUMERIC(12,2) DEFAULT 0,
    four_match_pool NUMERIC(12,2) DEFAULT 0,
    three_match_pool NUMERIC(12,2) DEFAULT 0,
    active_subscribers INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
];

const SEED_CHARITIES = `INSERT INTO charities (name, focus, highlight, description, is_featured) VALUES
  ('First Tee Futures', 'Youth access to golf and mentorship', 'Funding equipment grants, coaching hours, and junior event access.', 'First Tee Futures is dedicated to providing young people from underserved communities with access to golf, mentoring, and life skills development.', true),
  ('Fairway for Families', 'Family support during long-term treatment', 'Supports travel, accommodation, and emergency care for families in crisis.', 'Fairway for Families helps families going through difficult times by providing financial support for travel, housing, and care during extended medical treatments.', true),
  ('Greens for Good', 'Community wellbeing through sport', 'Builds local programmes that combine sport, mental health, and social care.', 'Greens for Good creates community-based programs that use sport as a vehicle for improving mental health, social connection, and overall wellbeing.', true)
ON CONFLICT DO NOTHING`;

async function runMigration() {
  console.log('🚀 Running database migration via Supabase SQL endpoint...\n');

  for (let i = 0; i < SQL_STATEMENTS.length; i++) {
    const sql = SQL_STATEMENTS[i];
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || `statement ${i + 1}`;
    
    try {
      const response = await globalThis.fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      // Try alternative SQL execution endpoint
      const response2 = await globalThis.fetch(`${SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'x-connection-encrypted': 'true',
        },
        body: JSON.stringify({ query: sql }),
      });

      if (response2.ok) {
        console.log(`✅ ${tableName}`);
      } else {
        const text = await response2.text();
        if (text.includes('already exists')) {
          console.log(`⚠️  ${tableName} (already exists)`);
        } else {
          console.log(`❌ ${tableName}: ${text.substring(0, 100)}`);
        }
      }
    } catch (err) {
      console.log(`❌ ${tableName}: ${err.message}`);
    }
  }

  // Seed charities
  try {
    const response = await globalThis.fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'x-connection-encrypted': 'true',
      },
      body: JSON.stringify({ query: SEED_CHARITIES }),
    });
    if (response.ok) console.log('✅ Seed data inserted');
    else console.log(`⚠️  Seed: ${(await response.text()).substring(0, 100)}`);
  } catch (err) {
    console.log(`⚠️  Seed: ${err.message}`);
  }

  console.log('\n🎉 Migration complete!');
}

runMigration();
