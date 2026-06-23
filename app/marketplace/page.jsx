'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const categories = ['All', 'Cement', 'Iron Rods', 'Sand', 'Gravel', 'Blocks', 'Roofing', 'Tiles', 'Paint', 'Pipes', 'Electrical', 'Timber', 'Glass', 'Hardware']

export default function MarketplacePage() {
  const supabase = createClient()
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [profile, setProfile] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', category: '', price: '', unit: '', description: '' })
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState('')
  const [orderingProduct, setOrderingProduct] = useState(null)
  const [orderForm, setOrderForm] = useState({ quantity: 1, delivery_address: '', note: '' })
  const [placingOrder, setPlacingOrder] = useState(false)

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setProfile(profileData)
      const { data } = await supabase
        .from('products')
        .select('*, profiles(id, full_name, company_name, city, state, is_verified)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      setProducts(data || [])
      setFiltered(data || [])
      setLoading(false)
    }
    getData()
  }, [])

  useEffect(() => {
    let results = [...products]
    if (category !== 'All') results = results.filter(p => p.category === category)
    if (search) results = results.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()))
    setFiltered(results)
  }, [category, search, products])

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.unit) { setMessage('Please fill name, price and unit'); return }
    setAdding(true)
    const { data, error } = await supabase.from('products').insert({
      supplier_id: profile.id,
      name: newProduct.name,
      category: newProduct.category,
      price: Number(newProduct.price),
      unit: newProduct.unit,
      description: newProduct.description,
      is_active: true,
    }).select('*, profiles(id, full_name, company_name, city, state, is_verified)').single()
    if (!error && data) {
      setProducts([data, ...products])
      setNewProduct({ name: '', category: '', price: '', unit: '', description: '' })
      setShowAddForm(false)
      setMessage('Product added successfully!')
      setTimeout(() => setMessage(''), 3000)
    }
    setAdding(false)
  }

  const handlePlaceOrder = async () => {
    if (!orderForm.delivery_address) { setMessage('Please enter a delivery address'); return }
    if (!orderForm.quantity || orderForm.quantity < 1) { setMessage('Please enter a valid quantity'); return }
    setPlacingOrder(true)
    const totalPrice = orderingProduct.price * Number(orderForm.quantity)
    const { error } = await supabase.from('orders').insert({
      buyer_id: profile.id,
      supplier_id: orderingProduct.profiles.id,
      product_id: orderingProduct.id,
      quantity: Number(orderForm.quantity),
      total_price: totalPrice,
      delivery_address: orderForm.delivery_address,
      buyer_note: orderForm.note,
      status: 'pending',
    })
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: orderingProduct.profiles.id,
        type: 'order',
        title: 'New order received!',
        body: `${profile.full_name} ordered ${orderForm.quantity} ${orderingProduct.unit} of ${orderingProduct.name}`,
        link: '/orders',
        is_read: false,
      })
      setOrderingProduct(null)
      setOrderForm({ quantity: 1, delivery_address: '', note: '' })
      setMessage('Order placed! Check My Orders to track it.')
      setTimeout(() => setMessage(''), 4000)
    } else {
      setMessage('Error placing order. Try again.')
    }
    setPlacingOrder(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      {/* Order modal */}
      {orderingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#00000088', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Place Order</h3>
            <p style={{ fontSize: '14px', color: '#666666', margin: '0 0 24px' }}>{orderingProduct.name} — ₦{Number(orderingProduct.price).toLocaleString()} per {orderingProduct.unit}</p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Quantity ({orderingProduct.unit})</label>
              <input
                type="number"
                min="1"
                value={orderForm.quantity}
                onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value })}
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Delivery Address *</label>
              <textarea
                placeholder="Enter your full delivery address..."
                value={orderForm.delivery_address}
                onChange={e => setOrderForm({ ...orderForm, delivery_address: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Note to supplier (optional)</label>
              <input
                type="text"
                placeholder="Any special instructions..."
                value={orderForm.note}
                onChange={e => setOrderForm({ ...orderForm, note: e.target.value })}
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Total */}
            <div style={{ background: '#F5EFE6', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#666666' }}>Total</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#1A1A1A' }}>
                  ₦{(orderingProduct.price * Number(orderForm.quantity || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            {message && <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>{message}</p>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setOrderingProduct(null); setOrderForm({ quantity: 1, delivery_address: '', note: '' }); setMessage('') }}
                style={{ flex: 1, background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #EEE6DA', padding: '14px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                style={{ flex: 2, background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
              >
                {placingOrder ? 'Placing Order...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Materials Marketplace</h1>
            <p style={{ color: '#666666', fontSize: '15px', margin: 0 }}>Compare prices from verified suppliers across Nigeria</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/orders" style={{ background: '#F5EFE6', color: '#8B5E3C', textDecoration: 'none', border: '1.5px solid #8B5E3C', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', fontSize: '14px' }}>
              My Orders
            </Link>
            {profile?.role === 'supplier' && (
              <button onClick={() => setShowAddForm(!showAddForm)} style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                + List a Product
              </button>
            )}
          </div>
        </div>

        {message && <p style={{ color: message.includes('Error') ? '#c0392b' : '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>}

        {/* Add product form */}
        {showAddForm && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #8B5E3C', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 20px' }}>List a New Product</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Product Name</label>
                <input type="text" placeholder="e.g. Dangote Cement 50kg" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Category</label>
                <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#FFFFFF', boxSizing: 'border-box' }}>
                  <option value="">Select category</option>
                  {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Price (₦)</label>
                <input type="number" placeholder="e.g. 8500" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Unit</label>
                <input type="text" placeholder="e.g. bag, ton, piece" value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Description (optional)</label>
              <textarea placeholder="Any extra details about this product..." value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} rows={2}
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddForm(false)} style={{ flex: 1, background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #EEE6DA', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddProduct} disabled={adding} style={{ flex: 2, background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                {adding ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#FFFFFF' }} />
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{ padding: '8px 16px', borderRadius: '20px', border: `1.5px solid ${category === cat ? '#1A1A1A' : '#EEE6DA'}`, background: category === cat ? '#1A1A1A' : '#FFFFFF', color: category === cat ? '#FFFFFF' : '#666666', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Products grid */}
        {filtered.length === 0
          ? (
            <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
              <p style={{ color: '#999999', fontSize: '15px', margin: '0 0 8px' }}>No products listed yet.</p>
              {profile?.role === 'supplier' && <p style={{ color: '#999999', fontSize: '13px', margin: 0 }}>You can list your first product above.</p>}
            </div>
          )
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filtered.map(product => (
                <div key={product.id} style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '15px', color: '#1A1A1A' }}>{product.name}</p>
                      {product.category && <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>{product.category}</span>}
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                      <p style={{ margin: '0 0 2px', fontWeight: '800', fontSize: '18px', color: '#1A1A1A' }}>₦{Number(product.price).toLocaleString()}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#999999' }}>per {product.unit}</p>
                    </div>
                  </div>

                  {product.description && <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 12px', lineHeight: '1.5' }}>{product.description}</p>}

                  <div style={{ borderTop: '1px solid #EEE6DA', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>{product.profiles?.company_name || product.profiles?.full_name}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#999999' }}>{[product.profiles?.city, product.profiles?.state].filter(Boolean).join(', ')}</p>
                      </div>
                      {product.profiles?.is_verified && (
                        <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>✓ Verified</span>
                      )}
                    </div>

                    {profile?.id !== product.profiles?.id && (
                      <button
                        onClick={() => setOrderingProduct(product)}
                        style={{ width: '100%', background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                      >
                        Order Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}