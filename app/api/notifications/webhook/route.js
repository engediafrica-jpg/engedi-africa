import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

// High-frequency, low-stakes notification types that don't deserve an email
// per occurrence. Everything else (bookings, payments, disputes, orders...)
// gets emailed.
const SKIP_TYPES = ['message']

function buildEmailHtml(record) {
  const link = record.link ? `https://engediafrica.com${record.link}` : 'https://engediafrica.com/dashboard'
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3EEE4;padding:32px 16px;font-family:Georgia,serif;">
  <tr>
    <td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#FAF6EF;border:1px solid #DED2BC;">
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;color:#B85C38;">EnGedi Africa</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 8px;">
            <p style="margin:0;font-family:Arial,sans-serif;font-size:19px;font-weight:bold;color:#1B1815;">${record.title || 'New notification'}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#6B6258;">${record.body || ''}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;">
            <a href="${link}" style="display:inline-block;background:#B85C38;color:#FBF3EA;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;">Open EnGedi Africa</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 28px;border-top:1px solid #DED2BC;">
            <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#A79E90;">You're receiving this because of activity on your EnGedi Africa account.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

export async function POST(request) {
  const secret = process.env.NOTIFICATIONS_WEBHOOK_SECRET
  if (secret && request.headers.get('x-webhook-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const record = payload?.record
    if (!record || SKIP_TYPES.includes(record.type)) {
      return NextResponse.json({ skipped: true })
    }

    const supabase = createAdminClient()
    const { data: user, error: userError } = await supabase.from('profiles').select('email, full_name').eq('id', record.user_id).single()
    if (userError || !user?.email) {
      return NextResponse.json({ skipped: true, reason: userError?.message || 'no email on profile' })
    }

    await sendEmail({
      to: user.email,
      toName: user.full_name,
      subject: record.title || 'New notification from EnGedi Africa',
      html: buildEmailHtml(record),
    })

    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error('Notification webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
