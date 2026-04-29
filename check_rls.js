const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.rpc('query_policies');
  if (error) {
    console.log("No rpc query_policies, trying direct SQL...");
    // We can't do direct SQL easily with supabase-js unless we have pg connection
  } else {
    console.log(data);
  }
}

check();
