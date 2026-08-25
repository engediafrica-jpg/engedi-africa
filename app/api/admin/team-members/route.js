import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const VALID_ROLES = ['admin', 'field_marketer', 'verifier', 'support']

async function getAuthedAdmin(supabase) {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Unauthorized', status: 401 }

    const { data: me, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (profileError || !me ? .is_admin) return { error: 'Forbidden — admin only', status: 403 }
    return { user }
}

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

            const lastNum = last ? .[0] ? .referral_code ?
                parseInt(last[0].referral_code.replace('FM', ''), 10) || 0 :
                0

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

        return NextResponse.json({
            success: true,
            referral_code,
            id: created.user.id,
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
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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

        // Remove the profile row first, then the auth user.
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