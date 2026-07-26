import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/dotenv/load.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const email = `test+${Date.now()}@example.com`;
  console.log(`Generating link for ${email}...`);
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
    password: "TestPassword123!",
    data: { role: 'franchise', test: true }
  });
  console.log(error ? error : data);
}
run();
