import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Service role client — bypasses RLS, used for all backend operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Anon client — for public-facing operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Connection test
Promise.resolve(supabaseAdmin.from('charities').select('count', { count: 'exact', head: true }))
  .then(({ count, error }) => {
    if (error) {
      console.log('   ⚠️  Supabase connected but tables may not exist yet:', error.message);
    } else {
      console.log(`   ✅ Supabase connected! (${count} charities found)`);
    }
  })
  .catch((err: Error) => console.error('   ❌ Supabase connection failed:', err.message));

export default supabaseAdmin;
