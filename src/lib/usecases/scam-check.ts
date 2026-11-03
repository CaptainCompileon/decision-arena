import type { UseCase } from "./types";

export const scamCheck: UseCase = {
  id: "scam-check",
  title: "Scam check",
  audience: "everyone",
  blurb: "Is this text or email a scam? The question your parents forward to you every week.",
  questions: {
    is_scam: {
      type: "noul",
      instructions: "Is this message a scam or phishing attempt?",
    },
    kind: {
      type: "choice",
      instructions: "What kind of message is it?",
      criteria: {
        legit: "A genuine message from a real sender",
        phishing_link: "Tries to get you to click a link or log in, to steal credentials",
        payment_pressure: "Pushes you to pay, send money or buy gift cards",
        prize: "Claims you won something or are owed money",
      },
    },
  },
  items: [
    {
      id: "dhl-customs",
      text: "SMS from +44 7700 900123: DHL: Your parcel is held at customs. Pay the 1.99 EUR fee within 24h or it will be returned: dhl-delivery-help.top/pay",
      labels: { is_scam: "yes", kind: "phishing_link" },
    },
    {
      id: "hi-mum",
      text: "SMS from an unknown number: Hi mum, I dropped my phone in the bath, this is my new number. Can you send £200 for rent today? I'll pay you back Friday x",
      labels: { is_scam: "yes", kind: "payment_pressure" },
    },
    {
      id: "uber-code",
      text: "SMS from Uber: Your Uber code is 482913. Never share this code.",
      labels: { is_scam: "no", kind: "legit" },
    },
    {
      id: "walmart-card",
      text: "SMS: Congratulations! You've been selected for a $1000 Walmart gift card. Claim before midnight: wmrt-rewards.co/claim",
      labels: { is_scam: "yes", kind: "prize" },
    },
    {
      id: "dentist",
      text: "SMS from SmileClinic: Reminder: your appointment is tomorrow at 9:30. Reply C to cancel.",
      labels: { is_scam: "no", kind: "legit" },
    },
    {
      id: "netflix-billing",
      text: "Email from billing@netflix-account-verify.com, subject 'Payment failed': Update your billing details in 24 hours to avoid suspension of your account. [Update now]",
      labels: { is_scam: "yes", kind: "phishing_link" },
    },
    {
      id: "irs-gift-cards",
      text: "Voicemail transcript: This is the IRS. You owe back taxes. Pay today with Google Play gift cards or a police officer will be sent to your address within two hours.",
      labels: { is_scam: "yes", kind: "payment_pressure" },
    },
    {
      id: "amazon-shipped",
      text: "Email from shipment-tracking@amazon.com: Your order #112-4839201-7745012 has shipped and arrives Thursday. Track it in Your Orders on amazon.com.",
      labels: { is_scam: "no", kind: "legit" },
    },
    {
      id: "hmrc-refund",
      text: "SMS: HMRC: You are due a tax refund of £326.40. Claim it here before it expires: hmrc-refund-gov.uk",
      labels: { is_scam: "yes", kind: "prize" },
    },
    {
      id: "climbing-jake",
      text: "WhatsApp from Jake (saved contact): hey, still on for climbing Thursday at 7? I can bring the spare rope",
      labels: { is_scam: "no", kind: "legit" },
    },
    {
      id: "mailbox-quota",
      text: "Email from 'IT Helpdesk' <it-support@mail-quota-admin.com>: Your mailbox is 98% full and will stop receiving mail. Re-validate your password here to get more storage.",
      labels: { is_scam: "yes", kind: "phishing_link" },
    },
    {
      id: "bank-new-device",
      text: "SMS from your bank's usual sender name: We noticed a sign-in from a new device. If this wasn't you, call the number on the back of your card. We will never ask for your PIN.",
      labels: { is_scam: "no", kind: "legit" },
    },
    {
      id: "crypto-returns",
      text: "Instagram DM: I've been making 30% a week with this trading program, guaranteed, my mentor only takes a few new people. Send 500 USDT to start and I'll set you up today.",
      labels: { is_scam: "yes", kind: "payment_pressure" },
    },
    {
      id: "euromillions",
      text: "Email: You have won €850,000 in the EuroMillions International Draw. Reply with your full name, address and bank details so we can release the funds.",
      labels: { is_scam: "yes", kind: "prize" },
    },
    {
      id: "spotify-renewal",
      text: "Email from no-reply@spotify.com: Your Premium plan renews on 12 November for €10.99. Manage your plan in the app.",
      labels: { is_scam: "no", kind: "legit" },
    },
    {
      id: "whatsapp-delete",
      text: "SMS: WhatsApp: Your account will be deleted in 12 hours for violating our terms. Verify now to keep it: wa-security-check.net",
      labels: { is_scam: "yes", kind: "phishing_link" },
    },
  ],
};
