import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { sendEmail } from '@/lib/email'

const VALID_ROLES = ['admin', 'field_marketer', 'verifier', 'support']

const teamRoleLabel = {
    admin: 'Admin',
    field_marketer: 'Field Marketer',
    verifier: 'Verifier',
    support: 'Support',
}

function buildWelcomeEmailHtml({ full_name, email, password, team_role, referral_code }) {
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
            <p style="margin:0;font-family:Arial,sans-serif;font-size:19px;font-weight:bold;color:#1B1815;">Welcome to the team, ${full_name}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 20px;">
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#6B6258;">You've been added to EnGedi Africa as a <strong>${teamRoleLabel[team_role] || team_role}</strong>. Here are your login details:</p>
            <p style="margin:0 0 4px;font-size:14px;color:#1B1815;"><strong>Email:</strong> ${email}</p>
            <p style="margin:0 0 4px;font-size:14px;color:#1B1815;"><strong>Password:</strong> ${password}</p>
            ${referral_code ? `<p style="margin:12px 0 0;font-size:14px;color:#1B1815;"><strong>Your referral code:</strong> ${referral_code}</p><p style="margin:4px 0 0;font-size:13px;color:#6B6258;">Referral link: engediafrica.com/signup?ref=${referral_code}</p>` : ''}
            <p style="margin:16px 0 0;font-size:13px;color:#6B6258;">We recommend changing your password after your first login.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;">
            <a href="https://engediafrica.com/login" style="display:inline-block;background:#B85C38;color:#FBF3EA;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;">Log In</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

async function getAuthedAdmin(supabase) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized', status: 401 }

  const { data: me, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !me?.is_admin) return { error: 'Forbidden — admin only', status: 403 }
  return { user }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {}
          },
        },
      }
    )

    const auth = await getAuthedAdmin(supabase)
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { full_name, email, password, team_role } = body
    if (!full_name || !email || !password) {
      return NextResponse.json({ error: 'Missing fields: full_name, email, password required' }, { status: 400 })
    }
    if (!team_role || !VALID_ROLES.includes(team_role)) {
      return NextResponse.json({ error: `team_role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, team_role },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    let referral_code = null

    if (team_role === 'field_marketer') {
      const { data: last } = await admin
        .from('profiles')
        .select('referral_code')
        .like('referral_code', 'FM%')
        .order('referral_code', { ascending: false })
        .limit(1)

      const lastNum = last?.[0]?.referral_code
        ? parseInt(last[0].referral_code.replace('FM', ''), 10) || 0
        : 0

      referral_code = 'FM' + String(lastNum + 1).padStart(3, '0')
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({
        full_name,
        is_team_member: true,
        team_role,
        referral_code,
        profile_completed: true,
      })
      .eq('id', created.user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // Send the welcome email. If this fails, don't fail the whole request —
    // the team member account still exists, just flag the email issue.
    let emailSent = true
    let emailError = null
    try {
      await sendEmail({
        to: email,
        toName: full_name,
        subject: 'Welcome to the EnGedi Africa team',
        html: buildWelcomeEmailHtml({ full_name, email, password, team_role, referral_code }),
      })
    } catch (err) {
      emailSent = false
      emailError = err.message || 'Unknown email error'
      console.error('Team member welcome email failed:', err)
    }

    return NextResponse.json({
      success: true,
      referral_code,
      id: created.user.id,
      email_sent: emailSent,
      email_error: emailError,
      message: `Team member created with role ${team_role}`,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {}
          },
        },
      }
    )

    const auth = await getAuthedAdmin(supabase)
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { member_id } = body
    if (!member_id) {
      return NextResponse.json({ error: 'Missing field: member_id required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error: profileDeleteError } = await admin
      .from('profiles')
      .delete()
      .eq('id', member_id)

    if (profileDeleteError) {
      return NextResponse.json({ error: profileDeleteError.message }, { status: 400 })
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(member_id)
    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}