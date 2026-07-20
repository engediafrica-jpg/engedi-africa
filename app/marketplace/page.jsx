'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import Input from '@/components/Input'
import useAccessGate from '@/hooks/useAccessGate'
import LockedNotice from '@/components/LockedNotice'

const categories = ['All', 'Cement', 'Iron Rods', 'Sand', 'Gravel', 'Blocks', 'Roofing', 'Tiles', 'Paint', 'Pipes', 'Electrical', 'Timber', 'Glass', 'Hardware', 'Equipment Rental', 'Heavy Machinery', 'Power Tools', 'Scaffolding']

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

  const { locked, checking } = useAccessGate(profile)

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading...</p>
    </div>
  )

  if (checking) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading...</p>
    </div>
  )

  if (locked) return <LockedNotice reason={locked} />

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Dashboard</Link>} />

      {/* Order modal */}
      {orderingProduct && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-6">
          <div className="ticks w-full max-w-[480px] border border-line bg-surface-raised p-8">
            <h3 className="m-0 mb-2 text-[18px] font-bold text-text">Place Order</h3>
            <p className="m-0 mb-6 text-[14px] text-text-muted">{orderingProduct.name} — ₦{Number(orderingProduct.price).toLocaleString()} per {orderingProduct.unit}</p>

            <div className="mb-4">
              <Input label={`Quantity (${orderingProduct.unit})`} type="number" min="1" value={orderForm.quantity} onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value })} />
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[13px] font-semibold text-text">Delivery Address *</label>
              <textarea
                placeholder="Enter your full delivery address..."
                value={orderForm.delivery_address}
                onChange={e => setOrderForm({ ...orderForm, delivery_address: e.target.value })}
                rows={3}
                className="w-full resize-y border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay"
              />
            </div>

            <div className="mb-6">
              <Input label="Note to supplier (optional)" type="text" placeholder="Any special instructions..." value={orderForm.note} onChange={e => setOrderForm({ ...orderForm, note: e.target.value })} />
            </div>

            {/* Total */}
            <div className="mb-5 border border-line bg-surface-sunk p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-text-muted">Total</span>
                <span className="font-mono text-[18px] font-bold tabular-nums text-text">
                  ₦{(orderingProduct.price * Number(orderForm.quantity || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            {message && <p className="mb-3 text-[13px] text-danger">{message}</p>}

            <div className="flex gap-2.5">
              <Button
                variant="outline"
                className="flex-1 justify-center"
                onClick={() => { setOrderingProduct(null); setOrderForm({ quantity: 1, delivery_address: '', note: '' }); setMessage('') }}
              >
                Cancel
              </Button>
              <Button className="flex-[2] justify-center" disabled={placingOrder} onClick={handlePlaceOrder}>
                {placingOrder ? 'Placing Order...' : 'Confirm Order'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1000px] px-6 py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="m-0 mb-2 text-[28px] font-bold text-text">Materials Marketplace</h1>
            <p className="m-0 text-[15px] text-text-muted">Compare prices from verified suppliers across Nigeria</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button href="/orders" variant="outline">My Orders</Button>
            {['supplier', 'equipment_provider'].includes(profile?.role) && (
              <Button onClick={() => setShowAddForm(!showAddForm)}>+ List a Product</Button>
            )}
          </div>
        </div>

        {message && <p className={`mb-4 text-[13px] font-semibold ${message.includes('Error') ? 'text-danger' : 'text-oasis'}`}>{message}</p>}

        {/* Add product form */}
        {showAddForm && (
          <div className="ticks mb-6 border border-clay bg-surface-raised p-8">
            <h3 className="m-0 mb-5 text-[16px] font-bold text-text">List a New Product</h3>
            <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <Input label="Product Name" type="text" placeholder="e.g. Dangote Cement 50kg" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-text">Category</label>
                <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay">
                  <option value="">Select category</option>
                  {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Input label="Price (₦)" type="number" placeholder="e.g. 8500" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} />
              <Input label="Unit" type="text" placeholder="e.g. bag, ton, piece" value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })} />
            </div>
            <div className="mb-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-text">Description (optional)</label>
              <textarea placeholder="Any extra details about this product..." value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} rows={2}
                className="w-full resize-y border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay" />
            </div>
            <div className="flex gap-2.5">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button className="flex-[2] justify-center" disabled={adding} onClick={handleAddProduct}>
                {adding ? 'Adding...' : 'Add Product'}
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-5">
          <input type="text" placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay" />
        </div>

        {/* Category pills */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`border px-4 py-2 text-[13px] font-semibold ${category === cat ? 'border-text bg-text text-surface' : 'border-line-strong text-text-muted hover:border-text'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Products grid */}
        {filtered.length === 0
          ? (
            <div className="border border-line bg-surface-raised p-16 text-center">
              <p className="m-0 mb-2 text-[15px] text-text-muted">No products listed yet.</p>
              {['supplier', 'equipment_provider'].includes(profile?.role) && <p className="m-0 text-[13px] text-text-muted">You can list your first product above.</p>}
            </div>
          )
          : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {filtered.map(product => (
                <div key={product.id} className="border border-line bg-surface-raised p-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <p className="m-0 mb-1 text-[15px] font-bold text-text">{product.name}</p>
                      {product.category && <Badge tone="pending">{product.category}</Badge>}
                    </div>
                    <div className="ml-3 text-right">
                      <p className="m-0 mb-0.5 font-mono text-[18px] font-bold tabular-nums text-text">₦{Number(product.price).toLocaleString()}</p>
                      <p className="m-0 text-[11px] text-text-muted">per {product.unit}</p>
                    </div>
                  </div>

                  {product.description && <p className="mb-3 text-[13px] leading-relaxed text-text-muted">{product.description}</p>}

                  <div className="border-t border-line pt-3">
                    <div className="mb-2.5 flex items-center justify-between">
                      <div>
                        <p className="m-0 mb-0.5 text-[13px] font-semibold text-text">{product.profiles?.company_name || product.profiles?.full_name}</p>
                        <p className="m-0 text-[12px] text-text-muted">{[product.profiles?.city, product.profiles?.state].filter(Boolean).join(', ')}</p>
                      </div>
                      {product.profiles?.is_verified && <Badge tone="success">Verified</Badge>}
                    </div>

                    {profile?.id !== product.profiles?.id && (
                      <Button className="w-full justify-center text-[13px]" onClick={() => setOrderingProduct(product)}>Order Now</Button>
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
