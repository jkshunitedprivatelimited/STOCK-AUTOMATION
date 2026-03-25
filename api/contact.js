export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )
    return res.status(200).end()
  }

  // Set CORS headers for actual response
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Use dedicated contact API key if available, fallback to main API key
  const apiKey = process.env.RESEND_CONTACT_API_KEY || process.env.VITE_RESEND_CONTACT_API_KEY || process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ message: 'Server configuration error: missing RESEND_API_KEY' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'JKSH Website <onboarding@resend.dev>',
        to: ['jkshunitedpvtltd@gmail.com'], // Resend sandbox requires verifying domain to send to jkshunitedpvtltd@gmail.com
        subject: `Enquiry: ${subject || "Website Contact"}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">New Contact Form Submission</h2>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${subject || 'N/A'}</p>
            </div>
            <div style="margin-top: 20px;">
              <h3 style="color: #475569; margin-bottom: 10px;">Message:</h3>
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; line-height: 1.6;">
                ${message.replace(/\n/g, '<br/>')}
              </div>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 30px;"/>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">This message was submitted via the JKSH contact form.</p>
          </div>
        `
      })
    });

    const resData = await response.json();

    if (!response.ok) {
      console.error('Resend API Error:', resData);
      return res.status(response.status).json({ message: resData.message || 'Failed to send email' });
    }

    return res.status(200).json({ success: true, id: resData.id });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
