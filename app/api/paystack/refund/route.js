import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { reference, amount } = await request.json()
        const body = { transaction: reference }
        if (amount) body.amount = Math.round(amount * 100)
        const response = await fetch('https://api.paystack.co/refund', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 })
    }
}
