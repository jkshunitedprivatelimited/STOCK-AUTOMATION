import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase internal environment variables.");
    }

    // Admin client bypasses RLS entirely
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse request
    const { target_item_id, target_bill_id, new_subtotal, new_total, new_discount } = await req.json();

    if (!target_item_id || !target_bill_id) {
      return new Response(
        JSON.stringify({ error: "Missing target_item_id or target_bill_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Step 1: Delete the item from bills_items_generated
    const { data: deletedItems, error: deleteError } = await supabaseAdmin
      .from("bills_items_generated")
      .delete()
      .eq("id", target_item_id)
      .select();

    if (deleteError) {
      throw new Error(`Delete failed: ${deleteError.message}`);
    }

    if (!deletedItems || deletedItems.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Item not found or already deleted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Step 2: Update the bill totals (and optionally discount)
    const updatePayload: Record<string, number> = {
      subtotal: Number(new_subtotal),
      total: Number(new_total),
    };
    if (new_discount !== undefined && new_discount !== null) {
      updatePayload.discount = Number(new_discount);
    }

    const { error: updateError } = await supabaseAdmin
      .from("bills_generated")
      .update(updatePayload)
      .eq("id", target_bill_id);

    if (updateError) {
      console.error("Bill update error (item already deleted):", updateError);
      // Non-fatal: item is already deleted, just log the update failure
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted_item: deletedItems[0],
        updated_bill: { subtotal: updatePayload.subtotal, total: updatePayload.total, discount: updatePayload.discount },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
