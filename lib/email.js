// Server-only. Never import this into a client component — BREVO_API_KEY
// must not reach the browser.
export async function sendEmail({ to, toName, subject, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || 'EnGedi Africa', email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    console.error('Brevo send failed:', await res.text())
  }
}
