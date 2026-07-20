import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { full_name, email, password } = await request.json()
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
  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

  const { data: last } = await admin
    .from('profiles')
    .select('referral_code')
    .like('referral_code', 'FM%')
    .order('referral_code', { ascending: false })
    .limit(1)
  const lastNum = last?.[0]?.referral_code ? parseInt(last[0].referral_code.replace('FM', ''), 10) || 0 : 0
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
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  return NextResponse.json({ referral_code, id: created.user.id })
}
