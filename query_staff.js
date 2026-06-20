import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceRoleMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const keyToUse = serviceRoleMatch ? serviceRoleMatch[1].trim() : envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, keyToUse);

async function check() {
  const { data, error } = await supabase.from('staff_profiles').select('*').eq('id', '8bf2bcbd-7efe-4d69-ac2e-4e23912985d9');
  console.log("Error:", error);
  console.log("Data:", data);
}
check();
