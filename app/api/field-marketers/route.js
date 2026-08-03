import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(request) {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {}
                    },
                },
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: me } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()

        if (!me ? .is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        let body
        try {
            body = await request.json()
        } catch (e) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        const { full_name, email, password } = body
        if (!full_name || !email || !password) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        const admin = createAdminClient()

        const { data: created, error: createError } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, role: 'field_marketer' },
        })

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 })
        }

        const { data: last } = await admin
            .from('profiles')
            .select('referral_code')
            .like('referral_code', 'FM%')
            .order('referral_code', { ascending: false })
            .limit(1)

        const lastNum = last ? .[0] ? .referral_code ?
            parseInt(last[0].referral_code.replace('FM', ''), 10) || 0 :
            0
        const referral_code = 'FM' + String(lastNum + 1).padStart(3, '0')

        const { error: updateError } = await admin
            .from('profiles')
            .update({
                full_name,
                role: 'field_marketer',
                referral_code,
                profile_completed: true,
            })
            .eq('id', created.user.id)

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 })
        }

        // Send welcome email via Brevo
        try {
            await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': process.env.BREVO_API_KEY,
                },
                body: JSON.stringify({
                    sender: { name: 'EnGedi Africa', email: 'hello@engediafrica.com' },
                    to: [{ email, name: full_name }],
                    subject: 'Welcome to EnGedi Africa — Your Field Marketer Details',
                    htmlContent: `
            <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;">
              <div style="background:#1A1A1A;padding:28px 32px;border-bottom:4px solid #8B5E3C;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;">EnGedi Africa</h1>
                <p style="color:#8B5E3C;margin:4px 0 0;font-size:13px;font-weight:600;">Field Marketer Programme</p>
              </div>
              <div style="padding:40px 32px;background:#ffffff;">
                <h2 style="color:#1A1A1A;font-size:22px;font-weight:800;margin:0 0 12px;">Welcome, ${full_name}! 🎉</h2>
                <p style="color:#666666;font-size:15px;line-height:1.7;margin:0 0 24px;">You have been onboarded as a Field Marketer for EnGedi Africa — Nigeria's construction marketplace. Here are your account details:</p>

                <div style="background:#F5EFE6;border-radius:12px;padding:24px;margin-bottom:28px;">
                  <p style="color:#1A1A1A;font-size:14px;font-weight:700;margin:0 0 16px;">Your Details</p>
                  <p style="color:#666666;font-size:14px;margin:0 0 8px;"><strong style="color:#1A1A1A;">Email:</strong> ${email}</p>
                  <p style="color:#666666;font-size:14px;margin:0 0 8px;"><strong style="color:#1A1A1A;">Password:</strong> ${password}</p>
                  <p style="color:#666666;font-size:14px;margin:0 0 8px;"><strong style="color:#1A1A1A;">Your Referral Code:</strong> <span style="font-size:20px;font-weight:800;color:#8B5E3C;letter-spacing:2px;">${referral_code}</span></p>
                  <p style="color:#666666;font-size:14px;margin:0;"><strong style="color:#1A1A1A;">Your Referral Link:</strong> https://engediafrica.com/signup?ref=${referral_code}</p>
                </div>

                <p style="color:#1A1A1A;font-size:15px;font-weight:700;margin:0 0 12px;">How it works:</p>
                <p style="color:#666666;font-size:14px;margin:0 0 8px;line-height:1.6;">✓ Share your referral link or code with artisans, suppliers, and professionals</p>
                <p style="color:#666666;font-size:14px;margin:0 0 8px;line-height:1.6;">✓ When they sign up using your code, they are registered under you</p>
                <p style="color:#666666;font-size:14px;margin:0 0 8px;line-height:1.6;">✓ You earn ₦5,000 commission for every verified user you bring on board</p>
                <p style="color:#666666;font-size:14px;margin:0 0 28px;line-height:1.6;">✓ Log in at engediafrica.com to track your referrals and earnings</p>

                <a href="https://engediafrica.com/login" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">Log In to Your Dashboard</a>

                <p style="color:#999999;font-size:13px;line-height:1.6;margin:28px 0 0;">Questions? Contact us at <a href="mailto:hello@engediafrica.com" style="color:#8B5E3C;text-decoration:none;font-weight:600;">hello@engediafrica.com</a> or call <a href="tel:+2349134459307" style="color:#8B5E3C;text-decoration:none;font-weight:600;">+234 913 445 9307</a></p>
              </div>
              <div style="background:#F9F6F1;border-top:1px solid #EEE6DA;padding:20px 32px;text-align:center;">
                <p style="color:#999999;font-size:12px;margin:0;">© 2026 EnGedi Africa · engediafrica.com</p>
              </div>
            </div>
          `,
                }),
            })
        } catch (emailErr) {
            console.log('Email failed but account created:', emailErr)
        }

        return NextResponse.json({
            success: true,
            referral_code,
            id: created.user.id,
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
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {}
                    },
                },
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: me } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()

        if (!me ? .is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        let body
        try {
            body = await request.json()
        } catch (e) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        const { marketer_id } = body
        if (!marketer_id) {
            return NextResponse.json({ error: 'marketer_id required' }, { status: 400 })
        }

        const admin = createAdminClient()

        const { error: deleteError } = await admin.auth.admin.deleteUser(marketer_id)
        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })

    } catch (err) {
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}