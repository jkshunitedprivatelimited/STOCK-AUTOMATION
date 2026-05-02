import { Webhook } from "https://esm.sh/svix@1.21.0";

const secret = 'whsec_r3g67Xa6zo4WPyUJlE69czQikUtbdwWq';
try {
  const wh = new Webhook(secret);
  console.log("Webhook instance created successfully");
} catch (err) {
  console.error("Error creating Webhook:", err);
}
