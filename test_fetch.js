import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceRoleMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const keyToUse = serviceRoleMatch ? serviceRoleMatch[1].trim() : envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, keyToUse);

async function check() {
  const fid = 'TV-1';
  try {
      const [ownerRes, staffRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('franchise_id', fid).maybeSingle(),
        supabase.from('staff_profiles').select('*').eq('franchise_id', fid).order('created_at', { ascending: false })
      ]);

      const ownerData = ownerRes.data;
      const staffData = staffRes.data;
      
      console.log("owner error", ownerRes.error);
      console.log("staff error", staffRes.error);

      if (ownerData?.company) {
        const { data: compData, error: compErr } = await supabase
          .from('companies')
          .select('*')
          .eq('company_name', ownerData.company)
          .maybeSingle();
        console.log("comp error", compErr);
      }

      let combined = [];
      if (ownerData) {
        combined.push({ ...ownerData, staff_id: "OWNER/ADMIN", isOwner: true, address: ownerData.address || "Branch Admin Office" });
      }
      if (staffData) combined = [...combined, ...staffData];
      console.log("Length:", combined.length);
  } catch(e) {
      console.log("EXCEPTION", e);
  }
}
check();
