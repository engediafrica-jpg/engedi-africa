'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import useAccessGate from '@/hooks/useAccessGate'
import LockedNotice from '@/components/LockedNotice'

const statusSteps = ['pending', 'paid', 'processing', 'dispatched', 'delivered']

const statusTone = (status) => {
  if (status === 'delivered' || status === 'completed') return 'success'
  if (status === 'cancelled' || status === 'disputed') return 'danger'
  return 'pending'
}

function StepCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" className="text-clay-contrast">
      <path d="M4 12L9 17L20 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function OrdersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('buying')
  const [updating, setUpdating] = useState(null)
  const [message, setMessage] = useState('')
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [payingOrder, setPayingOrder] = useState(null)
  const [disputeOrder, setDisputeOrder] = useState(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [submittingDispute, setSubmittingDispute] = useState(false)

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setProfile(profileData)
      await loadOrders(sessionData.session.user.id, 'buying')
      setLoading(false)
    }
    getData()

    if (document.getElementById('paystack-script')) { setScriptLoaded(true); return }
    const script = document.createElement('script')
    script.id = 'paystack-script'
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.onload = () => setScriptLoaded(true)
    document.body.appendChild(script)
  }, [])

  const loadOrders = async (uid, tab) => {
    setLoading(true)
    const field = tab === 'buying' ? 'buyer_id' : 'supplier_id'
    const { data, error } = await supabase
      .from('orders')
      .select('*, product:products(name, category, unit), buyer:profiles!orders_buyer_id_fkey(full_name, phone, city, avatar_url), supplier:profiles!orders_supplier_id_fkey(full_name, company_name, phone, city, bank_account_name, paystack_recipient_code)')
      .eq(field, uid)
      .order('created_at', { ascending: false })
    if (error) { console.log('Orders error:', error); setOrders([]) }
    else setOrders(data || [])
    setLoading(false)
  }

  const handleTabChange = async (tab) => {
    if (!profile) return
    setActiveTab(tab)
    await loadOrders(profile.id, tab)
  }

  const handlePayForOrder = (order) => {
    if (!scriptLoaded || !window.PaystackPop) { setMessage('Payment system loading. Please wait.'); return }
    setPayingOrder(order.id)
    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: profile.email,
      amount: Math.round(order.total_price * 100),
      currency: 'NGN',
      channels: ['card', 'bank', 'ussd', 'bank_transfer', 'opay', 'mobile_money'],
      ref: Date.now().toString() + '-order-' + order.id.substring(0, 8),
      metadata: { order_id: order.id },
      callback: async (response) => {
        const verifyRes = await fetch('/api/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: response.reference }),
        })
        const verifyData = await verifyRes.json()
        if (verifyData.data?.status === 'success') {
          const autoConfirmAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
          const commission = order.total_price * 0.06
          const payout = order.total_price - commission
          const { error } = await supabase.from('orders').update({
            payment_status: 'paid',
            payment_reference: response.reference,
            status: 'paid',
            commission_rate: 0.06,
            commission_amount: commission,
            payout_amount: payout,
            auto_confirm_at: autoConfirmAt,
          }).eq('id', order.id)
          if (!error) {
            setOrders(orders.map(o => o.id === order.id ? { ...o, payment_status: 'paid', status: 'paid', payment_reference: response.reference, commission_amount: commission, payout_amount: payout } : o))
            await supabase.from('notifications').insert({
              user_id: order.supplier_id,
              type: 'order',
              title: 'Payment received for your order!',
              body: `${profile.full_name} has paid ₦${Number(order.total_price).toLocaleString()} for ${order.product?.name}`,
              link: '/orders',
              is_read: false,
            })
            setMessage('Payment successful! Funds are held until you confirm delivery.')
          }
        } else {
          setMessage('Payment verification failed. Contact support.')
        }
        setPayingOrder(null)
      },
      onClose: () => setPayingOrder(null),
    })
    handler.openIframe()
  }

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdating(orderId)
    setMessage('')
    const { error } = await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId)
    if (error) { setMessage('Error: ' + error.message); setUpdating(null); return }
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    setUpdating(null)

    if (newStatus === 'completed') {
      const order = orders.find(o => o.id === orderId)
      await supabase.from('notifications').insert({
        user_id: order.buyer_id,
        type: 'order',
        title: 'Your order is complete!',
        body: `Confirm delivery to release payment to the supplier.`,
        link: '/orders',
        is_read: false,
      })
    }
    setMessage('Status updated!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleConfirmDelivery = async (order) => {
    setUpdating(order.id)
    setMessage('')
    const { error } = await supabase.from('orders').update({
      status: 'delivered',
      payment_status: 'released',
      escrow_released: true,
      confirmed_at: new Date().toISOString(),
    }).eq('id', order.id)
    if (error) { setMessage('Error: ' + error.message); setUpdating(null); return }

    if (order.supplier?.paystack_recipient_code && order.payout_amount) {
      const transferRes = await fetch('/api/paystack/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: order.payout_amount,
          recipient_code: order.supplier.paystack_recipient_code,
          reason: `EnGedi payout for order ${order.id.substring(0, 8)}`,
          reference: Date.now().toString() + '-payout-' + order.id.substring(0, 8),
        }),
      })
      const transferData = await transferRes.json()
      if (transferData.data?.transfer_code) {
        await supabase.from('orders').update({ payout_reference: transferData.data.transfer_code }).eq('id', order.id)
      }
    }

    setOrders(orders.map(o => o.id === order.id ? { ...o, status: 'delivered', payment_status: 'released', escrow_released: true } : o))
    await supabase.from('notifications').insert({
      user_id: order.supplier_id,
      type: 'payment',
      title: 'Payment released! 🎉',
      body: `₦${Number(order.payout_amount).toLocaleString()} has been sent to your bank account.`,
      link: '/orders',
      is_read: false,
    })
    setUpdating(null)
    setMessage('Delivery confirmed! Payment released to supplier.')
    setTimeout(() => setMessage(''), 5000)
  }

  const handleRaiseDispute = async () => {
    if (!disputeReason.trim()) { setMessage('Please describe the issue'); return }
    setSubmittingDispute(true)
    const { error } = await supabase.from('disputes').insert({
      order_id: disputeOrder.id,
      raised_by: profile.id,
      reason: disputeReason,
      status: 'open',
    })
    if (!error) {
      await supabase.from('orders').update({ dispute_raised: true, status: 'disputed' }).eq('id', disputeOrder.id)
      setOrders(orders.map(o => o.id === disputeOrder.id ? { ...o, dispute_raised: true, status: 'disputed' } : o))
      await supabase.from('notifications').insert({
        user_id: disputeOrder.supplier_id,
        type: 'dispute',
        title: 'A dispute has been raised',
        body: `${profile.full_name} has raised a dispute on order #${disputeOrder.id.substring(0, 8)}`,
        link: '/orders',
        is_read: false,
      })
      const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true)
      for (const a of admins || []) {
        await supabase.from('notifications').insert({
          user_id: a.id,
          type: 'dispute',
          title: 'New dispute raised',
          body: `${profile.full_name} raised a dispute on order #${disputeOrder.id.substring(0, 8)}`,
          link: '/admin',
          is_read: false,
        })
      }
      setDisputeOrder(null)
      setDisputeReason('')
      setMessage('Dispute raised. Our team will review within 24 hours.')
    }
    setSubmittingDispute(false)
  }

  const { locked, checking } = useAccessGate(profile)

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading orders...</p>
    </div>
  )

  if (checking) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading orders...</p>
    </div>
  )

  if (locked) return <LockedNotice reason={locked} />

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Dashboard</Link>} />

      {/* Dispute modal */}
      {disputeOrder && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-6">
          <div className="ticks w-full max-w-[480px] border border-line bg-surface-raised p-8">
            <h3 className="m-0 mb-2 font-display text-[1.1rem] font-bold text-text">Raise a Dispute</h3>
            <p className="m-0 mb-6 text-[14px] text-text-muted">Order #{disputeOrder.id.substring(0, 8)} · {disputeOrder.product?.name}</p>
            <div className="mb-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-text">Describe the issue</label>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                rows={4}
                placeholder="What went wrong? Be as specific as possible..."
                className="w-full resize-y border border-line bg-surface px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay"
              />
            </div>
            <div className="mb-5 border border-clay bg-surface-sunk p-3">
              <p className="m-0 text-[13px] leading-relaxed text-clay">
                Raising a dispute will freeze the payment until our team reviews the issue. We aim to resolve disputes within 24-48 hours.
              </p>
            </div>
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => { setDisputeOrder(null); setDisputeReason('') }} className="flex-1 justify-center">Cancel</Button>
              <Button
                onClick={handleRaiseDispute}
                disabled={submittingDispute}
                className="flex-[2] justify-center border-danger bg-danger hover:bg-clay-deep"
              >
                {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[900px] px-6 py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 mb-2 text-[26px] font-bold text-text">Orders</h1>
            <p className="m-0 text-[15px] text-text-muted">Track your material orders and payments</p>
          </div>
          {!profile?.bank_account_name && (activeTab === 'selling') && (
            <Button href="/dashboard/bank-details" className="text-[13px]">+ Add Bank Details</Button>
          )}
        </div>

        {/* Bank details warning for suppliers */}
        {activeTab === 'selling' && !profile?.bank_account_name && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-clay bg-surface-sunk p-5">
            <div>
              <p className="m-0 mb-1 text-[15px] font-semibold text-text">Add your bank details</p>
              <p className="m-0 text-[13px] text-text-muted">You need to add your bank account to receive payments when orders are confirmed.</p>
            </div>
            <Button href="/dashboard/bank-details" className="text-[13px]">Add Now</Button>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 inline-flex border border-line-strong">
          {[
            { key: 'buying', label: 'My Orders' },
            { key: 'selling', label: 'Orders Received' },
          ].map((tab, i) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-6 py-2.5 font-display text-[14px] font-semibold transition-colors ${activeTab === tab.key ? 'bg-ink text-ink-text' : 'bg-surface-raised text-text-muted hover:text-text'} ${i > 0 ? 'border-l border-line-strong' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {message && <p className={`mb-4 text-[13px] font-semibold ${message.includes('Error') ? 'text-danger' : 'text-oasis'}`}>{message}</p>}

        {orders.length === 0 ? (
          <div className="ticks border border-line bg-surface-raised p-16 text-center">
            <p className="m-0 mb-2 text-[15px] font-semibold text-text-muted">No orders yet</p>
            <p className="m-0 mb-5 text-[13px] text-text-muted">
              {activeTab === 'buying' ? 'Visit the marketplace to order materials' : 'Orders from buyers will appear here'}
            </p>
            {activeTab === 'buying' && (
              <Button href="/marketplace" variant="solid" className="bg-ink border-ink hover:bg-clay-deep">Browse Marketplace</Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map(order => {
              const currentStep = statusSteps.indexOf(order.status)
              const isPaid = order.payment_status === 'paid'
              const isReleased = order.escrow_released
              return (
                <div key={order.id} className="ticks border border-line bg-surface-raised p-6">

                  {/* Header */}
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="m-0 mb-1 text-[16px] font-bold text-text">{order.product?.name || 'Product'}</h3>
                      <p className="m-0 mb-1 text-[13px] text-text-muted">{order.product?.category} · Qty: {order.quantity} {order.product?.unit}</p>
                      <p className="m-0 font-mono text-[12px] tabular-nums text-text-muted">Order #{order.id.substring(0, 8)} · {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="m-0 mb-1.5 font-mono text-[18px] font-bold tabular-nums text-text">₦{Number(order.total_price).toLocaleString()}</p>
                      <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                    </div>
                  </div>

                  {/* Escrow status */}
                  <div className={`mb-4 border p-3.5 ${isReleased ? 'border-oasis bg-oasis-soft' : isPaid ? 'border-clay bg-surface-sunk' : 'border-line bg-surface-sunk'}`}>
                    <p className={`m-0 text-[13px] font-semibold ${isReleased ? 'text-oasis' : isPaid ? 'text-clay' : 'text-text-muted'}`}>
                      {isReleased
                        ? 'Payment released to supplier'
                        : isPaid
                        ? 'Payment held in escrow — waiting for delivery confirmation'
                        : 'Awaiting payment'
                      }
                    </p>
                    {isPaid && !isReleased && order.payout_amount && (
                      <p className="m-0 mt-1 text-[12px] text-text-muted">
                        Supplier will receive ₦{Number(order.payout_amount).toLocaleString()} after confirmation (6% platform fee deducted)
                      </p>
                    )}
                    {isPaid && !isReleased && order.auto_confirm_at && (
                      <p className="m-0 mt-1 text-[12px] text-text-muted">
                        Auto-confirms on {new Date(order.auto_confirm_at).toLocaleDateString()} if no dispute is raised
                      </p>
                    )}
                  </div>

                  {/* Progress tracker */}
                  {order.status !== 'cancelled' && order.status !== 'disputed' && (
                    <div className="mb-5">
                      <div className="flex items-center">
                        {statusSteps.map((step, i) => (
                          <div key={step} className={`flex items-center ${i < statusSteps.length - 1 ? 'flex-1' : ''}`}>
                            <div className="flex flex-col items-center">
                              <div className={`flex h-6 w-6 shrink-0 items-center justify-center border ${i <= currentStep ? 'border-clay bg-clay' : 'border-line-strong bg-surface-sunk'}`}>
                                {i <= currentStep
                                  ? <StepCheck />
                                  : <span className="font-mono text-[10px] font-semibold text-text-muted">{i + 1}</span>
                                }
                              </div>
                              <p className={`m-0 mt-1 whitespace-nowrap text-[10px] capitalize ${i <= currentStep ? 'font-semibold text-text' : 'text-text-muted'}`}>{step}</p>
                            </div>
                            {i < statusSteps.length - 1 && (
                              <div className={`mx-1 mb-4 h-px flex-1 ${i < currentStep ? 'bg-clay' : 'bg-line'}`} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div className="mb-4 border border-line bg-surface-sunk p-3.5">
                    {activeTab === 'buying' ? (
                      <p className="m-0 text-[13px] text-text-muted">
                        <strong className="text-text">Supplier:</strong> {order.supplier?.company_name || order.supplier?.full_name} · {order.supplier?.city}
                      </p>
                    ) : (
                      <p className="m-0 text-[13px] text-text-muted">
                        <strong className="text-text">Buyer:</strong> {order.buyer?.full_name} · {order.buyer?.city} · {order.buyer?.phone}
                      </p>
                    )}
                    {order.delivery_address && <p className="m-0 mt-1.5 text-[13px] text-text-muted"><strong className="text-text">Delivery:</strong> {order.delivery_address}</p>}
                    {order.buyer_note && <p className="m-0 mt-1.5 text-[13px] text-text-muted"><strong className="text-text">Note:</strong> {order.buyer_note}</p>}
                  </div>

                  {/* Buyer actions */}
                  {activeTab === 'buying' && (
                    <div className="flex flex-wrap gap-2.5">
                      {order.status === 'pending' && order.payment_status !== 'paid' && (
                        <Button
                          onClick={() => handlePayForOrder(order)}
                          disabled={payingOrder === order.id}
                          className="bg-ink border-ink hover:bg-clay-deep"
                        >
                          {payingOrder === order.id ? 'Opening payment...' : `Pay ₦${Number(order.total_price).toLocaleString()}`}
                        </Button>
                      )}
                      {order.status === 'dispatched' && !order.escrow_released && !order.dispute_raised && (
                        <>
                          <Button
                            onClick={() => handleConfirmDelivery(order)}
                            disabled={updating === order.id}
                            className="bg-oasis border-oasis hover:bg-clay-deep"
                          >
                            {updating === order.id ? 'Confirming...' : 'Confirm I Received This Order'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setDisputeOrder(order)}
                            className="border-danger text-danger hover:bg-danger-soft"
                          >
                            Raise Dispute
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Supplier actions */}
                  {activeTab === 'selling' && (
                    <div className="flex flex-wrap gap-2.5">
                      {order.payment_status === 'paid' && order.status === 'paid' && (
                        <Button variant="outline" onClick={() => handleUpdateStatus(order.id, 'processing')} disabled={updating === order.id} className="text-[13px]">
                          Mark Processing
                        </Button>
                      )}
                      {order.status === 'processing' && (
                        <Button variant="outline" onClick={() => handleUpdateStatus(order.id, 'dispatched')} disabled={updating === order.id} className="text-[13px]">
                          Mark Dispatched
                        </Button>
                      )}
                      {!order.supplier?.bank_account_name && order.payment_status === 'paid' && (
                        <Button href="/dashboard/bank-details" variant="outline" className="border-clay text-clay text-[13px] hover:bg-surface-sunk">
                          Add Bank Details to Receive Payment
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
