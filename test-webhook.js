const { Webhook } = require('svix');

const secret = 'whsec_r3g67Xa6zo4WPyUJlE69czQikUtbdwWq';
const wh = new Webhook(secret);

const payload = {
  type: "email.bounced",
  data: {
    to: ["fakeuser5521@gmail.com"]
  }
};

const payloadString = JSON.stringify(payload);
const headers = wh.sign(payloadString);

fetch("https://vfhwuncpzbsjegmedvjr.supabase.co/functions/v1/resend-webhook", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...headers
  },
  body: payloadString
})
.then(async res => {
  console.log("Status:", res.status);
  console.log("Response:", await res.text());
})
.catch(err => console.error(err));
