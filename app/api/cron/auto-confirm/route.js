import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function payout(recipientCode, amount, reason, referencePrefix) {
    if (!recipientCode || !amount) return null
    const response = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            source: 'balance',
            amount: Math.round(amount * 100),
            recipient: recipientCode,
            reason,
            reference: Date.now().toString() + referencePrefix,
        }),
    })
    const data = await response.json()
    return data?.data?.transfer_code || null
}

export async function GET(request) {
    const secret = process.env.CRON_SECRET
    if (secret) {
        const auth = request.headers.get('authorization')
        if (auth !== `Bearer ${secret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    const supabase = createAdminClient()
    const now = new Date().toISOString()
    let ordersReleased = 0
    let bookingsReleased = 0

    const { data: orders } = await supabase
        .from('orders')
        .select('*, supplier:profiles!orders_supplier_id_fkey(paystack_recipient_code)')
        .eq('payment_status', 'paid')
        .eq('escrow_released', false)
        .eq('dispute_raised', false)
        .lte('auto_confirm_at', now)

    for (const order of orders || []) {
        const transferCode = await payout(
            order.supplier?.paystack_recipient_code,
            order.payout_amount,
            `EnGedi auto-confirm payout for order ${order.id.substring(0, 8)}`,
            '-autopayout-order-' + order.id.substring(0, 8)
        )
        await supabase.from('orders').update({
            status: 'delivered',
            payment_status: 'released',
            escrow_released: true,
            confirmed_at: now,
            ...(transferCode ? { payout_reference: transferCode } : {}),
        }).eq('id', order.id)
        await supabase.from('notifications').insert({
            user_id: order.supplier_id,
            type: 'payment',
            title: 'Payment released! 🎉',
            body: `Your order was auto-confirmed after 72 hours. ₦${Number(order.payout_amount).toLocaleString()} has been sent to your bank account.`,
            link: '/orders',
            is_read: false,
        })
        ordersReleased++
    }

    const { data: bookings } = await supabase
        .from('bookings')
        .select('*, provider:profiles!bookings_provider_id_fkey(paystack_recipient_code)')
        .eq('payment_status', 'paid')
        .eq('escrow_released', false)
        .eq('dispute_raised', false)
        .lte('auto_confirm_at', now)

    for (const booking of bookings || []) {
        const transferCode = await payout(
            booking.provider?.paystack_recipient_code,
            booking.payout_amount,
            `EnGedi auto-confirm payout for booking ${booking.id.substring(0, 8)}`,
            '-autopayout-booking-' + booking.id.substring(0, 8)
        )
        await supabase.from('bookings').update({
            status: 'completed',
            payment_status: 'released',
            escrow_released: true,
            confirmed_at: now,
            ...(transferCode ? { payout_reference: transferCode } : {}),
        }).eq('id', booking.id)
        await supabase.from('notifications').insert({
            user_id: booking.provider_id,
            type: 'payment',
            title: 'Payment released! 🎉',
            body: `Your booking was auto-confirmed after 72 hours. ₦${Number(booking.payout_amount).toLocaleString()} has been sent to your bank account.`,
            link: '/bookings',
            is_read: false,
        })
        bookingsReleased++
    }

    return NextResponse.json({ ordersReleased, bookingsReleased })
}
