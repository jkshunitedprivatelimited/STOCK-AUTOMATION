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
    const { target_invoice_id } = await req.json();

    if (!target_invoice_id) {
      return new Response(
        JSON.stringify({ error: "Missing target_invoice_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Step 1: Delete the items from invoice_items
    const { error: deleteItemsError } = await supabaseAdmin
      .from("invoice_items")
      .delete()
      .eq("invoice_id", target_invoice_id);

    if (deleteItemsError) {
      throw new Error(`Failed to delete invoice items: ${deleteItemsError.message}`);
    }

    // Step 2: Delete the invoice from invoices
    const { data: deletedInvoice, error: deleteInvoiceError } = await supabaseAdmin
      .from("invoices")
      .delete()
      .eq("id", target_invoice_id)
      .select();

    if (deleteInvoiceError) {
      throw new Error(`Failed to delete invoice: ${deleteInvoiceError.message}`);
    }

    if (!deletedInvoice || deletedInvoice.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Invoice not found or already deleted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted_invoice: deletedInvoice[0],
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
