import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceRoleMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const keyToUse = serviceRoleMatch ? serviceRoleMatch[1].trim() : envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, keyToUse);

async function check() {
  const { data, error } = await supabase
        .from('login_logs')
        .select(`
          *,
          staff_profiles!login_logs_staff_id_fkey (name, staff_id)
        `)
        .limit(2);
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  if (data?.length > 0) console.log(data[0]);
}
check();
