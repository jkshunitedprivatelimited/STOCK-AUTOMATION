import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceRoleMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const keyToUse = serviceRoleMatch ? serviceRoleMatch[1].trim() : envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, keyToUse);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'login_logs' });
  console.log("RPC Error:", error);
  console.log("Policies:", data);
}
checkPolicies();
