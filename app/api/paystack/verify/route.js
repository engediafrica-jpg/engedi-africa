import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { reference } = await request.json()
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
        })
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 })
    }
}