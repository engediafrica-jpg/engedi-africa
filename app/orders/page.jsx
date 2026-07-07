'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const statusColors = {
  pending: { bg: '#FFF8F0', border: '#8B5E3C', color: '#8B5E3C' },
  paid: { bg: '#EEF2FF', border: '#6366F1', color: '#6366F1' },
  processing: { bg: '#EEF2FF', border: '#6366F1', color: '#6366F1' },
  dispatched: { bg: '#FFF8F0', border: '#F59E0B', color: '#F59E0B' },
  delivered: { bg: '#e8f8f0', border: '#2ecc71', color: '#27ae60' },
  completed: { bg: '#e8f8f0', border: '#2ecc71', color: '#27ae60' },
  cancelled: { bg: '#fde8e8', border: '#c0392b', color: '#c0392b' },
  disputed: { bg: '#fde8e8', border: '#c0392b', color: '#c0392b' },
}

const statusSteps = ['pending', 'paid', 'processing', 'dispatched', 'delivered']

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
      setDisputeOrder(null)
      setDisputeReason('')
      setMessage('Dispute raised. Our team will review within 24 hours.')
    }
    setSubmittingDispute(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading orders...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      {/* Dispute modal */}
      {disputeOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#00000088', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Raise a Dispute</h3>
            <p style={{ fontSize: '14px', color: '#666666', margin: '0 0 24px' }}>Order #{disputeOrder.id.substring(0, 8)} · {disputeOrder.product?.name}</p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Describe the issue</label>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                rows={4}
                placeholder="What went wrong? Be as specific as possible..."
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div style={{ background: '#FFF8F0', border: '1px solid #8B5E3C', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#8B5E3C', lineHeight: '1.6' }}>
                ⚠️ Raising a dispute will freeze the payment until our team reviews the issue. We aim to resolve disputes within 24-48 hours.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setDisputeOrder(null); setDisputeReason('') }} style={{ flex: 1, background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #EEE6DA', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRaiseDispute} disabled={submittingDispute} style={{ flex: 2, background: '#c0392b', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Orders</h1>
            <p style={{ color: '#666666', fontSize: '15px', margin: 0 }}>Track your material orders and payments</p>
          </div>
          {!profile?.bank_account_name && (activeTab === 'selling') && (
            <Link href="/dashboard/bank-details" style={{ background: '#8B5E3C', color: '#FFFFFF', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>
              + Add Bank Details
            </Link>
          )}
        </div>

        {/* Bank details warning for suppliers */}
        {activeTab === 'selling' && !profile?.bank_account_name && (
          <div style={{ background: '#FFF8F0', border: '1.5px solid #8B5E3C', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontWeight: '700', color: '#1A1A1A', margin: '0 0 4px', fontSize: '15px' }}>⚠️ Add your bank details</p>
              <p style={{ color: '#666666', fontSize: '13px', margin: 0 }}>You need to add your bank account to receive payments when orders are confirmed.</p>
            </div>
            <Link href="/dashboard/bank-details" style={{ background: '#8B5E3C', color: '#FFFFFF', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>Add Now</Link>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { key: 'buying', label: '🛒 My Orders' },
            { key: 'selling', label: '📦 Orders Received' },
          ].map(tab => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              style={{ padding: '10px 24px', borderRadius: '8px', border: `1.5px solid ${activeTab === tab.key ? '#1A1A1A' : '#EEE6DA'}`, background: activeTab === tab.key ? '#1A1A1A' : '#FFFFFF', color: activeTab === tab.key ? '#FFFFFF' : '#666666', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {message && <p style={{ color: message.includes('Error') ? '#c0392b' : '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>}

        {orders.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#999999', fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>No orders yet</p>
            <p style={{ color: '#999999', fontSize: '13px', margin: '0 0 20px' }}>
              {activeTab === 'buying' ? 'Visit the marketplace to order materials' : 'Orders from buyers will appear here'}
            </p>
            {activeTab === 'buying' && (
              <Link href="/marketplace" style={{ background: '#1A1A1A', color: '#FFFFFF', textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px' }}>
                Browse Marketplace
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {orders.map(order => {
              const statusStyle = statusColors[order.status] || statusColors.pending
              const currentStep = statusSteps.indexOf(order.status)
              const isPaid = order.payment_status === 'paid'
              const isReleased = order.escrow_released
              return (
                <div key={order.id} style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px' }}>

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 4px' }}>{order.product?.name || 'Product'}</h3>
                      <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 4px' }}>{order.product?.category} · Qty: {order.quantity} {order.product?.unit}</p>
                      <p style={{ fontSize: '12px', color: '#999999', margin: 0 }}>Order #{order.id.substring(0, 8)} · {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0 0 6px', fontWeight: '800', fontSize: '18px', color: '#1A1A1A' }}>₦{Number(order.total_price).toLocaleString()}</p>
                      <span style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', textTransform: 'capitalize' }}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Escrow status */}
                  <div style={{ background: isReleased ? '#e8f8f0' : isPaid ? '#EEF2FF' : '#F9F6F1', border: `1px solid ${isReleased ? '#2ecc71' : isPaid ? '#6366F1' : '#EEE6DA'}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: isReleased ? '#27ae60' : isPaid ? '#6366F1' : '#999999' }}>
                      {isReleased
                        ? '✓ Payment released to supplier'
                        : isPaid
                        ? '🔒 Payment held in escrow — waiting for delivery confirmation'
                        : '⏳ Awaiting payment'
                      }
                    </p>
                    {isPaid && !isReleased && order.payout_amount && (
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666666' }}>
                        Supplier will receive ₦{Number(order.payout_amount).toLocaleString()} after confirmation (6% platform fee deducted)
                      </p>
                    )}
                    {isPaid && !isReleased && order.auto_confirm_at && (
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666666' }}>
                        Auto-confirms on {new Date(order.auto_confirm_at).toLocaleDateString()} if no dispute is raised
                      </p>
                    )}
                  </div>

                  {/* Progress tracker */}
                  {order.status !== 'cancelled' && order.status !== 'disputed' && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {statusSteps.map((step, i) => (
                          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < statusSteps.length - 1 ? 1 : 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: i <= currentStep ? '#1A1A1A' : '#EEE6DA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {i <= currentStep
                                  ? <span style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: '800' }}>✓</span>
                                  : <span style={{ color: '#999999', fontSize: '10px', fontWeight: '700' }}>{i + 1}</span>
                                }
                              </div>
                              <p style={{ fontSize: '10px', color: i <= currentStep ? '#1A1A1A' : '#999999', fontWeight: i <= currentStep ? '700' : '400', margin: '4px 0 0', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{step}</p>
                            </div>
                            {i < statusSteps.length - 1 && (
                              <div style={{ flex: 1, height: '2px', background: i < currentStep ? '#1A1A1A' : '#EEE6DA', margin: '0 4px', marginBottom: '16px' }}></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div style={{ background: '#F9F6F1', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                    {activeTab === 'buying' ? (
                      <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                        <strong style={{ color: '#1A1A1A' }}>Supplier:</strong> {order.supplier?.company_name || order.supplier?.full_name} · {order.supplier?.city}
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                        <strong style={{ color: '#1A1A1A' }}>Buyer:</strong> {order.buyer?.full_name} · {order.buyer?.city} · {order.buyer?.phone}
                      </p>
                    )}
                    {order.delivery_address && <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666666' }}><strong style={{ color: '#1A1A1A' }}>Delivery:</strong> {order.delivery_address}</p>}
                    {order.buyer_note && <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666666' }}><strong style={{ color: '#1A1A1A' }}>Note:</strong> {order.buyer_note}</p>}
                  </div>

                  {/* Buyer actions */}
                  {activeTab === 'buying' && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {order.status === 'pending' && order.payment_status !== 'paid' && (
                        <button
                          onClick={() => handlePayForOrder(order)}
                          disabled={payingOrder === order.id}
                          style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                        >
                          {payingOrder === order.id ? 'Opening payment...' : `Pay ₦${Number(order.total_price).toLocaleString()}`}
                        </button>
                      )}
                      {order.status === 'dispatched' && !order.escrow_released && !order.dispute_raised && (
                        <>
                          <button
                            onClick={() => handleConfirmDelivery(order)}
                            disabled={updating === order.id}
                            style={{ background: '#2ecc71', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                          >
                            {updating === order.id ? 'Confirming...' : '✓ Confirm I Received This Order'}
                          </button>
                          <button
                            onClick={() => setDisputeOrder(order)}
                            style={{ background: '#fde8e8', color: '#c0392b', border: '1px solid #c0392b', padding: '12px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                          >
                            Raise Dispute
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Supplier actions */}
                  {activeTab === 'selling' && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {order.payment_status === 'paid' && order.status === 'paid' && (
                        <button onClick={() => handleUpdateStatus(order.id, 'processing')} disabled={updating === order.id}
                          style={{ background: '#6366F1', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                          Mark Processing
                        </button>
                      )}
                      {order.status === 'processing' && (
                        <button onClick={() => handleUpdateStatus(order.id, 'dispatched')} disabled={updating === order.id}
                          style={{ background: '#F59E0B', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                          Mark Dispatched
                        </button>
                      )}
                      {!order.supplier?.bank_account_name && order.payment_status === 'paid' && (
                        <Link href="/dashboard/bank-details" style={{ background: '#FFF8F0', color: '#8B5E3C', border: '1px solid #8B5E3C', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}>
                          Add Bank Details to Receive Payment
                        </Link>
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