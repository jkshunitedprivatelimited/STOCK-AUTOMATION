import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceRoleMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const keyToUse = serviceRoleMatch ? serviceRoleMatch[1].trim() : envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, keyToUse);

async function check() {
  const { data: safeData, error } = await supabase
        .from('login_logs')
        .select(`
          *,
          staff_profiles!login_logs_staff_profile_id_fkey (name, staff_id),
          profiles!login_logs_owner_profile_id_fkey (name, company)
        `)
        .order('login_at', { ascending: false })
        .limit(2);
  console.log("Error:", error);
  
  if (safeData) {
      const missingStaffIds = [...new Set(safeData.filter(d => !d.staff_profiles && d.staff_id && !d.owner_profile_id).map(d => d.staff_id))];
      console.log("Missing IDs:", missingStaffIds);
      if (missingStaffIds.length > 0) {
        const { data: profiles } = await supabase.from('staff_profiles').select('id, name, staff_id').in('id', missingStaffIds);
        if (profiles) {
          const profileMap = {};
          profiles.forEach(p => profileMap[p.id] = p);
          safeData.forEach(d => {
            if (!d.staff_profiles && d.staff_id && profileMap[d.staff_id]) {
              d.staff_profiles = profileMap[d.staff_id];
            }
          });
        }
      }
      console.log("Final data sample staff_profiles:", safeData[0].staff_profiles);
  }
}
check();
