'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const statusColors = {
  pending: { bg: '#FFF8F0', border: '#8B5E3C', color: '#8B5E3C' },
  processing: { bg: '#EEF2FF', border: '#6366F1', color: '#6366F1' },
  dispatched: { bg: '#FFF8F0', border: '#F59E0B', color: '#F59E0B' },
  delivered: { bg: '#e8f8f0', border: '#2ecc71', color: '#27ae60' },
  cancelled: { bg: '#fde8e8', border: '#c0392b', color: '#c0392b' },
}

const statusSteps = ['pending', 'processing', 'dispatched', 'delivered']

export default function OrdersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('buying')
  const [updating, setUpdating] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single()
      setProfile(profileData)
      await loadOrders(sessionData.session.user.id, 'buying')
      setLoading(false)
    }
    getData()
  }, [])

  const loadOrders = async (uid, tab) => {
    setLoading(true)
    const field = tab === 'buying' ? 'buyer_id' : 'supplier_id'
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        product:products(name, category, unit),
        buyer:profiles!orders_buyer_id_fkey(full_name, phone, city),
        supplier:profiles!orders_supplier_id_fkey(full_name, company_name, phone, city)
      `)
      .eq(field, uid)
      .order('created_at', { ascending: false })
    if (error) {
      console.log('Orders error:', error)
      setOrders([])
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  const handleTabChange = async (tab) => {
    if (!profile) return
    setActiveTab(tab)
    await loadOrders(profile.id, tab)
  }

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdating(orderId)
    setMessage('')
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)
    if (error) { setMessage('Error updating: ' + error.message); setUpdating(null); return }
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    setUpdating(null)
    setMessage('Status updated!')
    setTimeout(() => setMessage(''), 3000)
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

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Orders</h1>
        <p style={{ color: '#666666', fontSize: '15px', margin: '0 0 32px' }}>Track your material orders and deliveries</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { key: 'buying', label: '🛒 My Orders' },
            { key: 'selling', label: '📦 Orders Received' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{ padding: '10px 24px', borderRadius: '8px', border: `1.5px solid ${activeTab === tab.key ? '#1A1A1A' : '#EEE6DA'}`, background: activeTab === tab.key ? '#1A1A1A' : '#FFFFFF', color: activeTab === tab.key ? '#FFFFFF' : '#666666', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
            >
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
              return (
                <div key={order.id} style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px' }}>

                  {/* Order header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 4px' }}>
                        {order.product?.name || 'Product'}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 4px' }}>
                        {order.product?.category} · Qty: {order.quantity} {order.product?.unit}
                      </p>
                      <p style={{ fontSize: '12px', color: '#999999', margin: 0 }}>
                        Ordered {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0 0 6px', fontWeight: '800', fontSize: '18px', color: '#1A1A1A' }}>
                        ₦{Number(order.total_price).toLocaleString()}
                      </p>
                      <span style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', textTransform: 'capitalize' }}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Progress tracker */}
                  {order.status !== 'cancelled' && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {statusSteps.map((step, i) => (
                          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < statusSteps.length - 1 ? 1 : 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: i <= currentStep ? '#1A1A1A' : '#EEE6DA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {i <= currentStep
                                  ? <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: '800' }}>✓</span>
                                  : <span style={{ color: '#999999', fontSize: '11px', fontWeight: '700' }}>{i + 1}</span>
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
                    {order.delivery_address && (
                      <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666666' }}>
                        <strong style={{ color: '#1A1A1A' }}>Delivery:</strong> {order.delivery_address}
                      </p>
                    )}
                    {order.buyer_note && (
                      <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666666' }}>
                        <strong style={{ color: '#1A1A1A' }}>Note:</strong> {order.buyer_note}
                      </p>
                    )}
                  </div>

                  {/* Supplier actions */}
                  {activeTab === 'selling' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '10px' }}>Update order status:</p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {order.status === 'pending' && (
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
                        {order.status === 'dispatched' && (
                          <button onClick={() => handleUpdateStatus(order.id, 'delivered')} disabled={updating === order.id}
                            style={{ background: '#2ecc71', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                            Mark Delivered
                          </button>
                        )}
                        <button onClick={() => handleUpdateStatus(order.id, 'cancelled')} disabled={updating === order.id}
                          style={{ background: '#fde8e8', color: '#c0392b', border: '1px solid #c0392b', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                          Cancel Order
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Buyer confirmation */}
                  {activeTab === 'buying' && order.status === 'dispatched' && (
                    <div style={{ marginTop: '12px' }}>
                      <button onClick={() => handleUpdateStatus(order.id, 'delivered')} disabled={updating === order.id}
                        style={{ background: '#2ecc71', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                        ✓ Confirm I Received This Order
                      </button>
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