import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(request) {
    try {
        // Create server client to check auth
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

        // Check user is logged in
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check user is admin
        const { data: me, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()

        if (profileError || !me ? .is_admin) {
            return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
        }

        // Parse request body
        let body
        try {
            body = await request.json()
        } catch (e) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        const { full_name, email, password } = body
        if (!full_name || !email || !password) {
            return NextResponse.json({ error: 'Missing fields: full_name, email, password required' }, { status: 400 })
        }

        // Use admin client to create user
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

        // Generate referral code
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

        // Update profile
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

        return NextResponse.json({
            success: true,
            referral_code,
            id: created.user.id,
            message: `Field marketer created with referral code ${referral_code}`
        })

    } catch (err) {
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}