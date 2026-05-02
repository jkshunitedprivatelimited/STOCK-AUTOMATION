import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  const email = `test_bounce_${Date.now()}@gmail.com`;
  console.log(`Testing registration with email: ${email}`);

  const metadata = {
    name: "Test",
    company: "Test Co",
    franchise_id: `TEST-${Date.now()}`,
    role: "franchise",
  };

  const startTime = Date.now();
  console.log("Calling register-user edge function...");
  
  const response = await fetch(`${supabaseUrl}/functions/v1/register-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseAnonKey}`,
      "apikey": supabaseAnonKey,
    },
    body: JSON.stringify({
      email,
      password: "password123",
      metadata,
    }),
  });

  const timeTaken = (Date.now() - startTime) / 1000;
  console.log(`Response received in ${timeTaken} seconds`);
  
  const result = await response.json();
  console.log("Response:", result);

  if (result.user) {
    console.log("User was created! Now polling to see if resend-webhook deletes it...");
    // The user was created. Let's see if it gets deleted.
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const res = await supabase.from('profiles').select('*').eq('id', result.user.id).single();
      if (res.error && res.error.code === 'PGRST116') {
        console.log(`SUCCESS: Profile deleted after ${(i + 1) * 5} seconds.`);
        break;
      } else {
        console.log(`Check ${i + 1}: Profile still exists.`);
      }
    }
  }
}

runTest();
