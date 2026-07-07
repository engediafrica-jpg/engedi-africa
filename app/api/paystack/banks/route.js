import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const response = await fetch('https://api.paystack.co/bank?country=nigeria&use_cursor=false&perPage=100', {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
        })
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 })
    }
}