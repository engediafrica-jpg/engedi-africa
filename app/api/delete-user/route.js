import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: me, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()

        if (profileError || !me ? .is_admin) {
            return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
        }

        let body
        try {
            body = await request.json()
        } catch (e) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        const { user_id } = body
        if (!user_id) {
            return NextResponse.json({ error: 'Missing field: user_id required' }, { status: 400 })
        }

        if (user_id === user.id) {
            return NextResponse.json({ error: 'You cannot delete your own account from here' }, { status: 400 })
        }

        const admin = createAdminClient()

        const { error: profileDeleteError } = await admin
            .from('profiles')
            .delete()
            .eq('id', user_id)

        if (profileDeleteError) {
            return NextResponse.json({ error: profileDeleteError.message }, { status: 400 })
        }

        const { error: authDeleteError } = await admin.auth.admin.deleteUser(user_id)
        if (authDeleteError) {
            return NextResponse.json({ error: authDeleteError.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}