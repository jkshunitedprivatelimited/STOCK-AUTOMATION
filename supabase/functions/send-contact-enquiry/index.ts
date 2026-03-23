import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { name, email, subject, message } = await req.json()

    // Validate
    if (!name || !email || !subject || !message) {
      throw new Error("All fields are required")
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) throw new Error("RESEND_API_KEY not configured")

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'JKSH United <noreply@jkshunited.com>',
        to: 'info@jkshunitedpvtltd.com',
        subject: `Website Enquiry: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: rgb(0,100,55); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">New Website Enquiry</h2>
            </div>
            <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 100px;">Name:</td>
                  <td style="padding: 8px 0; color: #4b5563;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td>
                  <td style="padding: 8px 0; color: #4b5563;"><a href="mailto:${email}">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Subject:</td>
                  <td style="padding: 8px 0; color: #4b5563;">${subject}</td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
              <p style="font-weight: bold; color: #374151; margin-bottom: 8px;">Message:</p>
              <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
              This enquiry was submitted from the JKSH United website.
            </p>
          </div>
        `,
        reply_to: email,
      }),
    })

    const resData = await res.json()
    console.log("Resend response:", JSON.stringify(resData))

    if (!res.ok) throw new Error(resData.message || "Failed to send email")

    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Error:", message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
