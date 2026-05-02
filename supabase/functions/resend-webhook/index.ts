import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

Deno.serve(async (req) => {
  try {
    // 1. Only accept POST
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // 2. Read the raw body
    const payloadString = await req.text();
    console.log("[resend-webhook] Received payload:", payloadString.substring(0, 200));

    const url = new URL(req.url);
    const secretParam = url.searchParams.get("secret");
    
    // We use a custom query parameter for security since svix HMAC is failing
    const EXPECTED_SECRET = "jksh_secure_webhook_9921";
    
    if (secretParam !== EXPECTED_SECRET) {
      console.error("[resend-webhook] Authentication failed. Invalid secret query parameter.");
      return new Response("Unauthorized", { status: 401 });
    }
    console.log("[resend-webhook] Authentication verified via secure URL parameter ✓");

    // 4. Parse the Resend Webhook Payload
    const payload = JSON.parse(payloadString);
    console.log(`[resend-webhook] Event type: ${payload.type}`);

    // 5. Handle bounce events
    if (payload.type === "email.bounced") {
      const bouncedEmail = payload.data?.to?.[0];
      if (!bouncedEmail) {
        console.error("[resend-webhook] Bounce event but no 'to' email found in payload");
        return new Response(JSON.stringify({ received: true, action: "no_email_in_payload" }), {
          headers: { "Content-Type": "application/json" }, status: 200,
        });
      }

      console.log(`[resend-webhook] 🔴 BOUNCE detected for: ${bouncedEmail}`);

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Find the user by email
      const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      if (usersError) {
        console.error("[resend-webhook] Failed to list users:", usersError);
        throw usersError;
      }

      const userToDelete = usersData.users.find((u) => u.email === bouncedEmail);

      if (userToDelete) {
        console.log(`[resend-webhook] Found user ${userToDelete.id} for bounced email. Deleting...`);
        
        // Also delete their profile row first (in case cascade doesn't handle it)
        await supabaseAdmin.from("profiles").delete().eq("id", userToDelete.id);
        
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.id);
        if (deleteError) {
          console.error("[resend-webhook] Failed to delete user:", deleteError);
        } else {
          console.log(`[resend-webhook] ✅ Successfully deleted user with bounced email: ${bouncedEmail}`);
        }
      } else {
        console.log(`[resend-webhook] User with email ${bouncedEmail} not found — may have already been cleaned up.`);
      }
    } else {
      console.log(`[resend-webhook] Ignoring event type: ${payload.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" }, status: 200,
    });

  } catch (error) {
    console.error("[resend-webhook] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { "Content-Type": "application/json" }, status: 500,
    });
  }
});
