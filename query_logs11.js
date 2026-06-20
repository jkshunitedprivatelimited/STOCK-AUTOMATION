import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceRoleMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const keyToUse = serviceRoleMatch ? serviceRoleMatch[1].trim() : envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, keyToUse);

async function check() {
  const [ownerRes, staffRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('franchise_id', 'TV-1').maybeSingle(),
    supabase.from('staff_profiles').select('*').eq('franchise_id', 'TV-1').order('created_at', { ascending: false })
  ]);
  console.log("TV-1 Owner:", ownerRes.data);
  console.log("TV-1 Staff:", staffRes.data);
  
  const [ownerRes27, staffRes27] = await Promise.all([
    supabase.from('profiles').select('*').eq('franchise_id', 'TV-27').maybeSingle(),
    supabase.from('staff_profiles').select('*').eq('franchise_id', 'TV-27').order('created_at', { ascending: false })
  ]);
  console.log("TV-27 Owner:", ownerRes27.data);
  console.log("TV-27 Staff:", staffRes27.data);
}
check();
