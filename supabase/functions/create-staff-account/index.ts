import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

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

    const { email, password, name, franchiseName, franchiseId, phone, address, staff_id } = body;
    
    if (!email || !password || !franchiseId) {
      return jsonResponse({ error: "Missing email, password, or franchiseId." }, 400);
    }

    // 1. Verify Authentication & Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: "Missing or invalid authorization header." }, 401);
    }
    
    const jwt = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    const caller = userData?.user;
    
    if (userError || !caller) {
      return jsonResponse({ error: "Invalid token." }, 401);
    }

    // Determine caller role
    const callerRole = caller.user_metadata?.role?.toLowerCase();
    const isCentralAdmin = callerRole === 'central';
    const callerFranchiseId = caller.user_metadata?.franchise_id || caller.user_metadata?.metadata?.franchise_id;

    // Check if caller has permission to create staff for this franchise
    if (!isCentralAdmin) {
      // If not central admin, must be franchise owner creating for THEIR franchise
      if (callerRole !== 'franchise' && callerRole !== 'owner') { // assuming owner/franchise roles
         return jsonResponse({ error: "Unauthorized. Must be an admin or franchise owner." }, 403);
      }
      
      // Let's verify by checking profiles table just to be safe if metadata isn't set
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('franchise_id, role')
        .eq('id', caller.id)
        .single();
        
      if (!profile || (profile.role !== 'central' && profile.franchise_id !== franchiseId)) {
         return jsonResponse({ error: "Unauthorized. You cannot create staff for another franchise." }, 403);
      }
    }

    // 2. Create the User via Admin API (Bypasses verification email!)
    console.log(`[create-staff-account] Creating user ${email}...`);
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm to prevent Supabase default email!
      user_metadata: {
        role: 'staff',
        name: name,
        franchise_id: franchiseId,
        staff_id: staff_id,
        phone: phone,
        address: address,
      },
    });

    if (authError) {
      console.error("[create-staff-account] Auth error:", authError);
      return jsonResponse({ error: authError.message || "Failed to create user account." }, 500);
    }

    const newUserId = authData.user.id;

    // 3. Send the custom Welcome Email via Resend
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      console.error("Missing RESEND_API_KEY. Account created, but email not sent.");
      return jsonResponse({ success: true, user_id: newUserId, email_sent: false, warning: "RESEND_API_KEY missing." });
    }

    const origin = req.headers.get("origin") || "https://jkshunited.com";
    const loginUrl = `${origin}/login`;

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #059669; margin-top: 0;">Welcome to JKSH United!</h2>
        <p>Hello <strong>${name || 'Team Member'}</strong>,</p>
        <p>An account has been created for you at <strong>${franchiseName || franchiseId}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #111827; font-size: 16px;">Your Login Details:</h3>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
        </div>

        <p>Please log in to the portal using the link below:</p>
        <a href="${loginUrl}" style="display: inline-block; background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-bottom: 20px;">Log in to your account</a>

        <p style="font-size: 12px; color: #6b7280; margin-bottom: 0;">
          For security reasons, we recommend changing your password after your first login.<br>
          If you have any questions, please contact your manager.
        </p>
      </div>
    `;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'JKSH United <onboarding@resend.dev>', // USING ONBOARDING FOR TESTING
          to: email,
          subject: `Welcome to JKSH! Your Account Details`,
          html: htmlBody,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        console.error("Resend API failed:", resData);
      }
    } catch (emailErr) {
       console.error("Email sending threw an error:", emailErr);
    }

    return jsonResponse({
      success: true,
      user_id: newUserId,
      email_sent: true
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("CRITICAL FUNCTION ERROR:", message);
    return jsonResponse({ error: message }, 500);
  }
});
