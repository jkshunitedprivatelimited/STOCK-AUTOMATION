import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
// try to find service role key
const serviceRoleMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const serviceRoleKey = serviceRoleMatch ? serviceRoleMatch[1].trim() : null;

if (!serviceRoleKey) {
  console.log("No service role key found. Trying ANON KEY...");
}

const keyToUse = serviceRoleKey || envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, keyToUse);

async function checkLogs() {
  const { data, error } = await supabase.from('login_logs').select('*').limit(5);
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  if (data?.length > 0) console.log(data[0]);
}
checkLogs();
