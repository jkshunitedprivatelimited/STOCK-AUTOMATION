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

    const { email, password, metadata, otp } = body;
    if (!email || !password || !metadata) {
      return jsonResponse({ error: "Missing email, password, or metadata." }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    let isCentralAdmin = false;

    console.log(`[register-user] Auth header present: ${!!authHeader}`);
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwt = authHeader.replace('Bearer ', '');
      console.log(`[register-user] JWT token length: ${jwt.length}`);
      
      // Use the admin client's getUser with the JWT token directly
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
      const user = userData?.user;
      
      console.log(`[register-user] getUser error: ${JSON.stringify(userError)}`);
      console.log(`[register-user] User found: ${!!user}, User ID: ${user?.id}`);
      console.log(`[register-user] User metadata role: ${user?.user_metadata?.role}`);
      
      if (user) {
        const tokenRole = user.user_metadata?.role;
        if (tokenRole && tokenRole.toLowerCase() === 'central') {
          isCentralAdmin = true;
          console.log(`[register-user] Central admin detected via user_metadata.`);
        } else {
          // Fallback: Check profiles table
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          console.log(`[register-user] Profile query error: ${JSON.stringify(profileError)}`);
          console.log(`[register-user] Profile data: ${JSON.stringify(profile)}`);
            
          if (profile && profile.role && profile.role.toLowerCase() === 'central') {
            isCentralAdmin = true;
            console.log(`[register-user] Central admin detected via profiles table.`);
          } else {
            console.log(`[register-user] User ${user.id} is NOT central. Metadata role: ${tokenRole}, Profile role: ${profile?.role}`);
          }
        }
      } else {
        console.log(`[register-user] getUser returned no user. Token may be invalid or expired.`);
      }
    } else {
      console.log(`[register-user] No valid Bearer auth header found.`);
    }

    console.log(`[register-user] Final isCentralAdmin: ${isCentralAdmin}`);

    // 1. Verify OTP (if not central admin)
    if (!isCentralAdmin) {
      if (!otp) {
        return jsonResponse({ error: "Missing OTP." }, 400);
      }

      const { data: otpData, error: otpError } = await supabaseAdmin
        .from('otp_requests')
        .select('*')
        .eq('email', email)
        .single();

      if (otpError || !otpData) {
        return jsonResponse({ error: "No OTP found for this email. Please request a new one." }, 400);
      }

      // 1a. Check expiration first
      if (new Date() > new Date(otpData.expires_at)) {
        await supabaseAdmin.from('otp_requests').delete().eq('email', email);
        return jsonResponse({ error: "OTP code has expired. Please request a new one." }, 400);
      }

      // 1b. Check validity
      if (otpData.otp_code !== otp) {
        const newAttemptsCount = (otpData.attempts_count || 0) + 1;
        if (newAttemptsCount >= 5) {
          await supabaseAdmin.from('otp_requests').delete().eq('email', email);
          return jsonResponse({ error: "Too many failed attempts. OTP has been invalidated. Please request a new one." }, 400);
        } else {
          await supabaseAdmin.from('otp_requests').update({ attempts_count: newAttemptsCount }).eq('email', email);
          return jsonResponse({ error: `Invalid OTP code. You have ${5 - newAttemptsCount} attempts remaining.` }, 400);
        }
      }

      // OTP is valid. Delete it so it can't be reused.
      await supabaseAdmin.from('otp_requests').delete().eq('email', email);
      console.log(`[register-user] OTP verified for ${email}.`);
    }

    // 2. Prevent Privilege Escalation
    // Force the role to 'franchise' unless a central admin is creating the account.
    // This prevents a malicious user from injecting { role: 'central' } in the payload.
    let safeMetadata = { ...metadata };
    if (!isCentralAdmin) {
      safeMetadata.role = 'franchise'; // Only admins can assign other roles
    }

    // 2. Create the user
    console.log(`[register-user] Creating user ${email}...`);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: safeMetadata,
    });

    if (authError) {
      console.error("[register-user] Auth error:", authError);
      return jsonResponse({ error: authError.message || "Failed to create user account." }, 500);
    }

    // 3. Send Welcome Email (Optional since they already verified, but keeping it for franchise details)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const origin = req.headers.get("origin") || "https://jkshunited.com";
      const loginUrl = `${origin}/login`;
      
      try {
        await fetch("https://api.resend.com/emails", {
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
      } catch (e) {
        console.error("Welcome email failed", e);
      }
    }

    console.log(`[register-user] ✅ User created: ${authData.user.id}`);

    return jsonResponse({
      message: "User created successfully",
      user: authData.user,
    });

  } catch (error) {
    console.error("[register-user] Fatal:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
