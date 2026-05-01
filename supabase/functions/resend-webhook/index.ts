import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Webhook } from "https://esm.sh/svix@1.15.0";

serve(async (req) => {
  try {
    // 1. Verify this is a POST request
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // 2. Verify the Webhook Signature
    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    const payloadString = await req.text();

    if (webhookSecret) {
      try {
        const wh = new Webhook(webhookSecret);
        // Svix validates the payload using the headers Resend passes
        wh.verify(payloadString, {
          "svix-id": req.headers.get("svix-id") || "",
          "svix-timestamp": req.headers.get("svix-timestamp") || "",
          "svix-signature": req.headers.get("svix-signature") || "",
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Webhook signature verification failed:", errorMessage);
        return new Response("Invalid signature", { status: 400 });
      }
    } else {
      console.warn("RESEND_WEBHOOK_SECRET is not set. Webhook is running insecurely.");
    }

    // 3. Parse the Resend Webhook Payload
    const payload = JSON.parse(payloadString);

    // 4. Check if the event is a bounce
    if (payload.type === "email.bounced") {
      const bouncedEmail = payload.data.to[0]; // The email address that bounced

      console.log(`[Webhook] Email bounced detected for: ${bouncedEmail}`);

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase credentials");
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // 5. Find the user by email and delete them
      const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      if (usersError) throw usersError;

      const userToDelete = usersData.users.find((u) => u.email === bouncedEmail);

      if (userToDelete) {
        console.log(`[Webhook] Found user ${userToDelete.id} for bounced email. Deleting...`);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.id);
        
        if (deleteError) {
          console.error(`[Webhook] Failed to delete user:`, deleteError);
        } else {
          console.log(`[Webhook] Successfully deleted user with bounced email: ${bouncedEmail}`);
        }
      } else {
        console.log(`[Webhook] User with email ${bouncedEmail} not found. They may have already been deleted.`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[Webhook] Error processing Resend webhook:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
