import { NextResponse } from 'next/server'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const account_number = searchParams.get('account_number')
        const bank_code = searchParams.get('bank_code')

        if (!account_number || !bank_code) {
            return NextResponse.json({ status: false, message: 'account_number and bank_code required' }, { status: 400 })
        }

        const response = await fetch(
            `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`, {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                },
            }
        )
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 })
    }
}