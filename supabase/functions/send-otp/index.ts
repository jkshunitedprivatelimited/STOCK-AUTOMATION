import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
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
      return jsonResponse({ error: "Missing Supabase internal environment variables." }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return jsonResponse({ error: "Invalid JSON request body." }, 400);
    }

    const { email } = body;
    
    // 1. Validate Email Format
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: "Missing or invalid email address." }, 400);
    }

    const domain = email.split('@')[1];

    try {
      const mxRecords = await Deno.resolveDns(domain, "MX");
      if (!mxRecords || mxRecords.length === 0) throw new Error("No MX records");
    } catch (_err) {
      return jsonResponse({ error: `Invalid email domain (@${domain}). It seems to be misspelled or does not exist.` }, 400);
    }

    // 2. Rate Limiting (60 seconds cooldown)
    const { data: existingOtp } = await supabaseAdmin
      .from('otp_requests')
      .select('expires_at')
      .eq('email', email)
      .maybeSingle();

    if (existingOtp?.expires_at) {
      const expiresTime = new Date(existingOtp.expires_at).getTime();
      const cooldownEnd = expiresTime - (9 * 60 * 1000); // 1 minute after creation (10 min expiry - 9 mins)
      if (Date.now() < cooldownEnd) {
        return jsonResponse({ error: "Please wait 60 seconds before requesting another OTP." }, 429);
      }
    }

    // 3. Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 4. Store in otp_requests table
    const { error: dbError } = await supabaseAdmin
      .from('otp_requests')
      .upsert({ email, otp_code: otpCode, expires_at: expiresAt, attempts_count: 0 });
    
    if (dbError) {
      console.error("[send-otp] DB Error:", dbError);
      return jsonResponse({ error: "Failed to generate OTP. Please try again." }, 500);
    }

    // 5. Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-otp] RESEND_API_KEY not set.");
      return jsonResponse({ error: "Email service is not configured. Please contact support." }, 500);
    }

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
          subject: "Your Registration Verification Code",
          html: `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
  <h2 style="color: #065f46; border-bottom: 2px solid #065f46; padding-bottom: 10px;">Email Verification</h2>
  <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">Hello,</p>
  <p style="color: #475569; font-size: 15px; line-height: 1.6;">
    Please use the following 6-digit code to verify your email address and complete your registration at <strong>JKSH United Private Limited</strong>.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <span style="display: inline-block; background-color: #f0fdf4; color: #065f46; font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 15px 30px; border-radius: 8px; border: 2px dashed #065f46;">
      ${otpCode}
    </span>
  </div>
  <p style="color: #ef4444; font-size: 14px; text-align: center;">This code will expire in 10 minutes.</p>
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
        console.error("[send-otp] Resend rejected:", resData);
        return jsonResponse({ error: `Failed to send email: ${resData.message || 'Rejected by mail server'}` }, 500);
      }
      
    } catch (emailErr) {
      console.error("[send-otp] Network error connecting to Resend:", emailErr);
      return jsonResponse({ error: "Failed to send email due to an internal server error." }, 500);
    }

    return jsonResponse({ message: "OTP sent successfully" });

  } catch (error) {
    console.error("[send-otp] Fatal:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
