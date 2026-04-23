import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase internal environment variables.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { user_id, franchise_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Manual JWT verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // 1. Delete stock_request_orders and login_logs (linked by user_id)
    await Promise.all([
      supabaseAdmin.from("stock_request_orders").delete().eq("user_id", user_id),
      supabaseAdmin.from("login_logs").delete().eq("user_id", user_id)
    ]);

    // 2. Delete franchise specific data if franchise_id is provided
    if (franchise_id) {
      // Menus first so we can delete bills items
      const { data: menuData } = await supabaseAdmin.from("menus").select("id").eq("franchise_id", franchise_id);
      const menuIds = menuData?.map((m: any) => m.id) || [];
      if (menuIds.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < menuIds.length; i += chunkSize) {
          await supabaseAdmin.from("bills_items_generated").delete().in("item_id", menuIds.slice(i, i + chunkSize));
        }
      }
      await supabaseAdmin.from("bills_generated").delete().eq("franchise_id", franchise_id);

      // Invoices
      const { data: invoices } = await supabaseAdmin.from("invoices").select("id").eq("franchise_id", franchise_id);
      const invoiceIds = invoices?.map((i: any) => i.id) || [];
      if (invoiceIds.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < invoiceIds.length; i += chunkSize) {
          await supabaseAdmin.from("invoice_items").delete().in("invoice_id", invoiceIds.slice(i, i + chunkSize));
        }
      }
      await supabaseAdmin.from("invoices").delete().eq("franchise_id", franchise_id);

      // Stocks and requests
      await supabaseAdmin.from("stocks").delete().eq("franchise_id", franchise_id);
      await supabaseAdmin.from("stock_requests").delete().eq("franchise_id", franchise_id);

      // Other franchise tables
      await Promise.all([
        supabaseAdmin.from("staff_profiles").delete().eq("franchise_id", franchise_id),
        supabaseAdmin.from("vouchers").delete().eq("franchise_id", franchise_id),
        supabaseAdmin.from("login_logs").delete().eq("franchise_id", franchise_id),
        supabaseAdmin.from("menus").delete().eq("franchise_id", franchise_id)
      ]);
    }

    // 3. Delete from public.profiles
    await supabaseAdmin.from("profiles").delete().eq("id", user_id);

    // 4. Finally, completely delete the user from auth.users (This permanently removes login access)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (authDeleteError) {
      console.warn("Could not delete from auth.users, they might have already been deleted:", authDeleteError.message);
    }

    return new Response(
      JSON.stringify({ success: true, message: "User completely deleted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
