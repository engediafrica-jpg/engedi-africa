import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 })

    try {
        const { amount, recipient_code, reason, reference } = await request.json()
        const response = await fetch('https://api.paystack.co/transfer', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                source: 'balance',
                amount: Math.round(amount * 100),
                recipient: recipient_code,
                reason: reason || 'EnGedi Africa payout',
                reference: reference || Date.now().toString() + '-payout',
            }),
        })
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 })
    }
}