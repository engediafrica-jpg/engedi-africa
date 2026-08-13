import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { name, account_number, bank_code } = await request.json()
        const response = await fetch('https://api.paystack.co/transferrecipient', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'nuban',
                name,
                account_number,
                bank_code,
                currency: 'NGN',
            }),
        })
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 })
    }
}