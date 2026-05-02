import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: "Missing Supabase internal environment variables." });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, password, metadata } = await req.json();
    if (!email || !password || !metadata) {
      return jsonResponse({ error: "Missing email, password, or metadata." });
    }

    // 1. Validate Email Domain (MX Records Check)
    const domain = email.split('@')[1];
    if (!domain) {
      return jsonResponse({ error: "Invalid email format." });
    }

    try {
      const mxRecords = await Deno.resolveDns(domain, "MX");
      if (!mxRecords || mxRecords.length === 0) throw new Error("No MX records");
    } catch (_err) {
      return jsonResponse({ error: `Invalid email domain (@${domain}). It seems to be misspelled or does not exist.` });
    }

    // 2. Send email via Resend BEFORE creating the user
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      const origin = req.headers.get("origin") || "https://jkshunited.com";
      const loginUrl = `${origin}/login`;
      let resendEmailId: string | null = null;

      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "JKSH United <noreply@jkshunited.com>",
            to: email,
            subject: "Welcome to JKSH United Private Limited",
            html: `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
  <h2 style="color: #065f46; border-bottom: 2px solid #065f46; padding-bottom: 10px;">Welcome to JKSH United Private Limited</h2>
  <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">Hello ${metadata.name},</p>
  <p style="color: #475569; font-size: 15px; line-height: 1.6;">
    A franchise account for <strong>${metadata.company}</strong> has been successfully created for you at <strong>JKSH United Private Limited</strong>. 
  </p>
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <h3 style="color: #0f172a; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Account Details</h3>
    <ul style="list-style-type: none; padding: 0; margin: 0; color: #334155; font-size: 15px; line-height: 1.8;">
      <li><strong>Franchise ID:</strong> ${metadata.franchise_id}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Password:</strong> ${password}</li>
    </ul>
  </div>
  <p style="color: #475569; font-size: 15px; line-height: 1.6;">To access your dashboard, please log in by clicking the button below:</p>
  <div style="text-align: center; margin: 35px 0;">
    <a href="${loginUrl}" style="background-color: #065f46; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Login to My Account</a>
  </div>
  <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
    If the button above doesn't work, copy and paste this link into your browser:<br>
    <a href="${loginUrl}" style="color: #065f46;">${loginUrl}</a>
  </p>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
  <p style="color: #94a3b8; font-size: 12px; text-align: center;">
    &copy; ${new Date().getFullYear()} JKSH United Private Limited. All rights reserved.<br>
    This is an automated message, please do not reply.
  </p>
</div>`,
          }),
        });

        const resData = await resendResponse.json();

        if (!resendResponse.ok) {
          console.error("[register-user] Resend rejected:", resData);
          return jsonResponse({ error: `Cannot register: Email rejected (${resData.message || 'Rejected by mail server'})` });
        }

        resendEmailId = resData.id;
        console.log(`[register-user] Email queued. Resend ID: ${resendEmailId}`);

      } catch (emailErr) {
        console.error("[register-user] Network error:", emailErr);
        return jsonResponse({ error: "Cannot register: Failed to send email. Check your internet and try again." });
      }

      // 3. BOUNCE DETECTION: Wait 15 seconds first (let the bounce happen), then check every 3s
      //    Total wait: 15 + (3 × 8) = 39 seconds max
      if (resendEmailId) {
        console.log(`[register-user] Waiting 15s for delivery/bounce for ${email}...`);
        await new Promise(resolve => setTimeout(resolve, 15000));

        for (let attempt = 1; attempt <= 8; attempt++) {
          try {
            const statusResponse = await fetch(`https://api.resend.com/emails/${resendEmailId}`, {
              headers: { "Authorization": `Bearer ${resendApiKey}` }
            });
            const statusData = await statusResponse.json();
            const lastEvent = statusData.last_event || "unknown";

            console.log(`[register-user] Check ${attempt}/8 for ${email}: ${lastEvent}`);

            if (lastEvent === "bounced") {
              console.error(`[register-user] BOUNCE DETECTED for ${email}. Aborting.`);
              return jsonResponse({ error: "Cannot register: This email address does not exist or cannot receive emails (Delivery Bounced). Please use a valid email." });
            }

            if (lastEvent === "delivered") {
              console.log(`[register-user] Email DELIVERED to ${email}. Creating user.`);
              break;
            }
          } catch (pollErr) {
            console.error(`[register-user] Check ${attempt} failed:`, pollErr);
          }

          // Don't wait after the last attempt
          if (attempt < 8) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
    } else {
      console.warn("[register-user] RESEND_API_KEY not set; skipping email check.");
    }

    // 4. No bounce detected. Create the user.
    console.log(`[register-user] No bounce for ${email}. Creating user...`);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (authError) {
      console.error("[register-user] Auth error:", authError);
      return jsonResponse({ error: authError.message || "Failed to create user account." });
    }

    console.log(`[register-user] ✅ User created: ${authData.user.id}`);

    return jsonResponse({
      message: "User created successfully",
      user: authData.user,
    });

  } catch (error) {
    console.error("[register-user] Fatal:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) });
  }
});
