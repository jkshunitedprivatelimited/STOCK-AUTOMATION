import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json()
    const { name, email, subject, message } = payload

    if (!name || !email || !message) {
      throw new Error(`Missing required fields`);
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) throw new Error("RESEND_API_KEY is missing in Edge Function environment")

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'JKSH Website <onboarding@resend.dev>',
        to: ['jkshunitedpvtltd@gmail.com'],
        subject: `Enquiry: ${subject || "Website Contact"}`,
        html: `
          <h3>New Contact Form Submission</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong><br/>${message}</p>
        `
      }),
    })

    const resData = await res.json()
    console.log("DEBUG: Resend API Response:", JSON.stringify(resData));

    if (!res.ok) throw new Error(resData.message || "Resend failed to send");

    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("CRITICAL FUNCTION ERROR:", message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
