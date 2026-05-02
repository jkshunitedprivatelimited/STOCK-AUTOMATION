import { Webhook } from "npm:svix@1.21.0";

const secret = 'whsec_r3g67Xa6zo4WPyUJlE69czQikUtbdwWq';
const wh = new Webhook(secret);

const payload = {
  type: "email.bounced",
  data: {
    to: ["test_bounce_1777711415062@gmail.com"]
  }
};

const payloadString = JSON.stringify(payload);
const headers = wh.sign(payloadString);

const response = await fetch("https://vfhwuncpzbsjegmedvjr.supabase.co/functions/v1/resend-webhook", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...headers
  },
  body: payloadString
});

console.log("Status:", response.status);
console.log("Response:", await response.text());
