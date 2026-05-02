import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://vfhwuncpzbsjegmedvjr.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmaHd1bmNwemJzamVnbWVkdmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzQ5NjAsImV4cCI6MjA4MzQ1MDk2MH0.aTTJWh5AGFlcXI1MrOyneTLrUnk3l-0R6ULbLVJjfS0");

async function test() {
  const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .limit(1);
  console.log("Error:", error);
  console.log("Data count:", data);
}
test();
