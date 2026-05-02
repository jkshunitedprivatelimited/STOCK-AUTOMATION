const { Webhook } = require('svix');

const secret = 'whsec_r3g67Xa6zo4WPyUJlE69czQikUtbdwWq';
const wh = new Webhook(secret);

const payloadString = "hello world";
try {
  wh.verify(payloadString, {
    "svix-id": "123",
    "svix-timestamp": "123",
    "svix-signature": "v1,abc"
  });
} catch (e) {
  console.log(e);
}
