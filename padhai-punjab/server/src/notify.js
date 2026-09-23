// Outbound notifications: SMS (OTP) and safety-team alerts.
// In dev mode messages are only logged. In production, configure a provider.

export async function sendSms(config, phone, message) {
  if (config.devMode && !config.smsWebhookUrl) {
    if (!config.quiet) console.log(`[sms → ${phone}] ${message}`);
    return;
  }
  if (!config.smsWebhookUrl) {
    throw new Error('SMS_WEBHOOK_URL is not configured; cannot send OTP in production.');
  }
  // Generic JSON webhook so any Indian SMS gateway (MSG91, Gupshup, Twilio via a small
  // relay function, etc.) can be plugged in without code changes.
  const res = await fetch(config.smsWebhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(config.smsWebhookToken ? { authorization: `Bearer ${config.smsWebhookToken}` } : {}) },
    body: JSON.stringify({ to: `+91${phone}`, message }),
  });
  if (!res.ok) throw new Error(`SMS gateway returned ${res.status}`);
}

/** Alert the safety team immediately (report filed, tutor submitted checks, …). */
export async function alertSafetyTeam(config, subject, details) {
  if (!config.quiet) console.log(`[safety-alert] ${subject}`, details);
  if (!config.safetyWebhookUrl) return;
  try {
    await fetch(config.safetyWebhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: `🛡 Padhai Punjab: ${subject}`, details }),
    });
  } catch (e) {
    console.error('Safety webhook failed', e);
  }
}
