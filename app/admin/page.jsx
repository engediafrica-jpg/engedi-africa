'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const TOTAL_MODULES = 5

// ============================================================
// EnGedi Brand Colours
// ============================================================
const C = {
  black: '#111111',
  ink: '#1A1A1A',
  white: '#FFFFFF',

  // EnGedi laterite / earth accent
  laterite: '#8B5E3C',
  lateriteDark: '#6F472D',
  lateriteLight: '#F3E8DE',
  lateriteSoft: '#F8F2ED',

  // Neutral system
  background: '#F7F5F2',
  surface: '#FFFFFF',
  border: '#E5DED6',
  muted: '#77716B',
  lightMuted: '#A39D96',

  // Status colours — intentionally subtle
  success: '#3F6B4F',
  successBg: '#EDF4EF',

  danger: '#8B3A32',
  dangerBg: '#F8ECEA',

  warning: '#8B6538',
  warningBg: '#F8F1E7',

  info: '#4C6175',
  infoBg: '#EEF2F5',
}

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')

  const [docUrls, setDocUrls] = useState({})
  const [loadingDocs, setLoadingDocs] = useState(false)

  const [activeTab, setActiveTab] = useState('users')

  const [training, setTraining] = useState([])
  const [trainingLoading, setTrainingLoading] = useState(false)

  const [marketers, setMarketers] = useState([])
  const [marketersLoading, setMarketersLoading] = useState(false)

  const [showMarketerForm, setShowMarketerForm] = useState(false)

  const [marketerForm, setMarketerForm] = useState({
    full_name: '',
    email: '',
    password: '',
  })

  const [creatingMarketer, setCreatingMarketer] = useState(false)
  const [deletingMarketer, setDeletingMarketer] = useState(null)

  const [revenue, setRevenue] = useState({
    orders: 0,
    bookings: 0,
    total: 0,
  })

  const [revenueLoading, setRevenueLoading] = useState(false)

  const [disputes, setDisputes] = useState([])
  const [disputesLoading, setDisputesLoading] = useState(false)

  // ============================================================
  // Initial Data
  // ============================================================

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } =
        await supabase.auth.getSession()

      if (!sessionData.session) {
        router.push('/login')
        return
      }

      const { data: me } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single()

      if (!me?.is_admin) {
        router.push('/dashboard')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      setUsers(data || [])
      setLoading(false)
    }

    getData()
  }, [])

  // ============================================================
  // Training
  // ============================================================

  const loadTraining = async () => {
    setTrainingLoading(true)

    const { data } = await supabase
      .from('training_completions')
      .select(
        '*, user:profiles!training_completions_user_id_fkey(full_name, email, avatar_url)'
      )
      .eq('passed', true)
      .order('created_at', { ascending: false })

    setTraining(data || [])
    setTrainingLoading(false)
  }

  // ============================================================
  // Field Marketers
  // ============================================================

  const loadMarketers = async () => {
    setMarketersLoading(true)

    const { data } = await supabase
      .from('profiles')
      .select(
        '*, signups:field_marketer_signups(id, referred_user_name, referred_user_role, created_at)'
      )
      .eq('role', 'field_marketer')
      .order('created_at', { ascending: false })

    setMarketers(data || [])
    setMarketersLoading(false)
  }

  // ============================================================
  // Revenue
  // ============================================================

  const loadRevenue = async () => {
    setRevenueLoading(true)

    const { data: orders } = await supabase
      .from('orders')
      .select('commission_amount')
      .eq('payment_status', 'released')

    const { data: bookings } = await supabase
      .from('bookings')
      .select('commission_amount')
      .eq('payment_status', 'released')

    const orderRevenue =
      orders?.reduce(
        (sum, order) =>
          sum + Number(order.commission_amount || 0),
        0
      ) || 0

    const bookingRevenue =
      bookings?.reduce(
        (sum, booking) =>
          sum + Number(booking.commission_amount || 0),
        0
      ) || 0

    setRevenue({
      orders: orderRevenue,
      bookings: bookingRevenue,
      total: orderRevenue + bookingRevenue,
    })

    setRevenueLoading(false)
  }

  // ============================================================
  // Disputes
  // ============================================================

  const loadDisputes = async () => {
    setDisputesLoading(true)

    const { data } = await supabase
      .from('disputes')
      .select(
        '*, raiser:profiles!disputes_raised_by_fkey(full_name, email)'
      )
      .order('created_at', { ascending: false })

    setDisputes(data || [])
    setDisputesLoading(false)
  }

  // ============================================================
  // Documents
  // ============================================================

  const loadDocuments = async (user) => {
    setLoadingDocs(true)

    const urls = {}

    if (user.id_document_url) {
      const { data } = await supabase.storage
        .from('verification-docs')
        .createSignedUrl(user.id_document_url, 3600)

      if (data) {
        urls.id = data.signedUrl
      }
    }

    if (user.cac_document_url) {
      const { data } = await supabase.storage
        .from('verification-docs')
        .createSignedUrl(user.cac_document_url, 3600)

      if (data) {
        urls.cac = data.signedUrl
      }
    }

    if (user.professional_license_url) {
      const { data } = await supabase.storage
        .from('verification-docs')
        .createSignedUrl(
          user.professional_license_url,
          3600
        )

      if (data) {
        urls.license = data.signedUrl
      }
    }

    setDocUrls(urls)
    setLoadingDocs(false)
  }

  const handleSelect = async (user) => {
    if (selected?.id === user.id) {
      setSelected(null)
      setDocUrls({})
      return
    }

    setSelected(user)
    setNote(user.admin_notes || '')

    await loadDocuments(user)
  }

  // ============================================================
  // Verification
  // ============================================================

  const handleVerify = async (userId, status) => {
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({
        verification_status: status,
        is_verified: status === 'approved',
        admin_notes: note,
      })
      .eq('id', userId)

    if (error) {
      setMessage('Error updating verification status')
      return
    }

    setUsers(
      users.map((user) =>
        user.id === userId
          ? {
              ...user,
              verification_status: status,
              is_verified: status === 'approved',
              admin_notes: note,
            }
          : user
      )
    )

    setSelected(null)
    setDocUrls({})
    setNote('')

    setMessage(
      status === 'approved'
        ? 'User approved successfully'
        : status === 'rejected'
        ? 'User rejected successfully'
        : 'Verification reset to pending'
    )

    setTimeout(() => setMessage(''), 3000)
  }

  // ============================================================
  // Create Field Marketer
  // ============================================================

  const handleCreateMarketer = async () => {
    if (
      !marketerForm.full_name ||
      !marketerForm.email ||
      !marketerForm.password
    ) {
      setMessage('Please fill all fields')
      return
    }

    if (marketerForm.password.length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }

    setCreatingMarketer(true)
    setMessage('')

    const res = await fetch('/api/field-marketers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(marketerForm),
    })

    const data = await res.json()

    if (data.success) {
      setMessage(
        `Field marketer created successfully. Referral code: ${data.referral_code}`
      )

      setMarketerForm({
        full_name: '',
        email: '',
        password: '',
      })

      setShowMarketerForm(false)

      await loadMarketers()
    } else {
      setMessage('Error: ' + data.error)
    }

    setCreatingMarketer(false)
  }

  // ============================================================
  // Delete Field Marketer
  // ============================================================

  const handleDeleteMarketer = async (marketerId) => {
    if (
      !confirm(
        'Are you sure you want to delete this field marketer? This cannot be undone.'
      )
    ) {
      return
    }

    setDeletingMarketer(marketerId)

    const res = await fetch('/api/field-marketers', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        marketer_id: marketerId,
      }),
    })

    const data = await res.json()

    if (data.success) {
      setMarketers(
        marketers.filter(
          (marketer) => marketer.id !== marketerId
        )
      )

      setMessage(
        'Field marketer deleted successfully'
      )

      setTimeout(() => setMessage(''), 3000)
    } else {
      setMessage('Error: ' + data.error)
    }

    setDeletingMarketer(null)
  }

  // ============================================================
  // Resolve Dispute
  // ============================================================

  const handleResolveDispute = async (
    disputeId,
    resolution
  ) => {
    const { error } = await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolution,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId)

    if (!error) {
      setDisputes(
        disputes.map((dispute) =>
          dispute.id === disputeId
            ? {
                ...dispute,
                status: 'resolved',
                resolution,
              }
            : dispute
        )
      )

      setMessage('Dispute resolved')

      setTimeout(() => setMessage(''), 3000)
    }
  }

  // ============================================================
  // Labels
  // ============================================================

  const roleLabel = {
    project_owner: 'Project Owner',
    artisan: 'Artisan',
    supplier: 'Supplier',
    professional: 'Professional',
    service_provider: 'Service Provider',
    equipment_provider: 'Equipment Provider',
    field_marketer: 'Field Marketer',
  }

  // ============================================================
  // Training Calculations
  // ============================================================

  const trainingByUser = training.reduce(
    (acc, item) => {
      const uid = item.user_id

      if (!acc[uid]) {
        acc[uid] = {
          user: item.user,
          modules: [],
        }
      }

      acc[uid].modules.push(item)

      return acc
    },
    {}
  )

  const pendingVerification = users.filter(
    (user) =>
      user.documents_submitted &&
      user.verification_status === 'pending'
  )

  // ============================================================
  // Loading Screen
  // ============================================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            'Arial, Helvetica, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: C.black,
              color: C.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              fontWeight: '800',
              fontSize: '16px',
            }}
          >
            E
          </div>

          <p
            style={{
              color: C.muted,
              fontSize: '14px',
              margin: 0,
            }}
          >
            Loading admin panel...
          </p>
        </div>
      </div>
    )
  }

  // ============================================================
  // Main UI
  // ============================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.background,
        fontFamily:
          'Arial, Helvetica, sans-serif',
        color: C.ink,
      }}
    >
      {/* HEADER */}

      <div
        style={{
          background: C.black,
          borderBottom: `3px solid ${C.laterite}`,
          padding: '0 24px',
          minHeight: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/"
          style={{
            color: C.white,
            textDecoration: 'none',
            fontWeight: '800',
            fontSize: '20px',
            letterSpacing: '-0.4px',
          }}
        >
          EnGedi Africa
        </Link>

        <Link
          href="/dashboard"
          style={{
            color: '#BDB8B2',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          ← Dashboard
        </Link>
      </div>

      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '42px 24px 70px',
        }}
      >
        {/* PAGE TITLE */}

        <div style={{ marginBottom: '28px' }}>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '11px',
              color: C.laterite,
              fontWeight: '800',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}
          >
            EnGedi Africa
          </p>

          <h1
            style={{
              fontSize: '28px',
              fontWeight: '800',
              color: C.black,
              margin: '0 0 6px',
              letterSpacing: '-0.7px',
            }}
          >
            Admin Panel
          </h1>

          <p
            style={{
              color: C.muted,
              fontSize: '14px',
              margin: 0,
            }}
          >
            {users.length} total users ·{' '}
            {pendingVerification.length} pending
            verification
          </p>
        </div>

        {/* TABS */}

        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          {[
            {
              key: 'users',
              label: `All Users (${users.length})`,
            },
            {
              key: 'pending',
              label: `Pending Review (${pendingVerification.length})`,
            },
            {
              key: 'training',
              label: 'Training Progress',
            },
            {
              key: 'marketers',
              label: `Field Marketers (${marketers.length})`,
            },
            {
              key: 'disputes',
              label: 'Disputes',
            },
            {
              key: 'revenue',
              label: 'Revenue',
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)

                if (
                  tab.key === 'training' &&
                  training.length === 0
                ) {
                  loadTraining()
                }

                if (
                  tab.key === 'marketers' &&
                  marketers.length === 0
                ) {
                  loadMarketers()
                }

                if (tab.key === 'revenue') {
                  loadRevenue()
                }

                if (
                  tab.key === 'disputes' &&
                  disputes.length === 0
                ) {
                  loadDisputes()
                }
              }}
              style={{
                padding: '10px 15px',
                borderRadius: '7px',
                border: `1px solid ${
                  activeTab === tab.key
                    ? C.black
                    : C.border
                }`,
                background:
                  activeTab === tab.key
                    ? C.black
                    : C.white,
                color:
                  activeTab === tab.key
                    ? C.white
                    : C.muted,
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              background: message.includes('Error')
                ? C.dangerBg
                : C.lateriteSoft,
              border: `1px solid ${
                message.includes('Error')
                  ? C.danger
                  : C.laterite
              }`,
              color: message.includes('Error')
                ? C.danger
                : C.lateriteDark,
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '18px',
            }}
          >
            {message}
          </div>
        )}

        {/* =====================================================
            REVENUE
        ===================================================== */}

        {activeTab === 'revenue' && (
          <div>
            {revenueLoading ? (
              <p style={{ color: C.muted }}>
                Loading revenue...
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px',
                }}
              >
                {[
                  {
                    label: 'Orders Commission',
                    value: revenue.orders,
                  },
                  {
                    label: 'Bookings Commission',
                    value: revenue.bookings,
                  },
                  {
                    label: 'Total Revenue',
                    value: revenue.total,
                    featured: true,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: C.white,
                      border: `1px solid ${
                        item.featured
                          ? C.laterite
                          : C.border
                      }`,
                      borderRadius: '12px',
                      padding: '22px',
                      boxShadow:
                        '0 2px 8px rgba(0,0,0,0.03)',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 10px',
                        fontSize: '12px',
                        color: C.muted,
                        fontWeight: '700',
                      }}
                    >
                      {item.label}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '26px',
                        fontWeight: '800',
                        color: item.featured
                          ? C.laterite
                          : C.black,
                      }}
                    >
                      ₦
                      {Number(
                        item.value
                      ).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            DISPUTES
        ===================================================== */}

        {activeTab === 'disputes' && (
          <div>
            {disputesLoading ? (
              <p style={{ color: C.muted }}>
                Loading disputes...
              </p>
            ) : disputes.length === 0 ? (
              <div
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: '12px',
                  padding: '50px 30px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    color: C.lightMuted,
                    fontSize: '14px',
                    margin: 0,
                    fontWeight: '600',
                  }}
                >
                  No disputes yet
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {disputes.map((dispute) => {
                  const resolved =
                    dispute.status === 'resolved'

                  return (
                    <div
                      key={dispute.id}
                      style={{
                        background: C.white,
                        border: `1px solid ${
                          resolved
                            ? C.border
                            : C.laterite
                        }`,
                        borderRadius: '12px',
                        padding: '20px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent:
                            'space-between',
                          alignItems:
                            'flex-start',
                          flexWrap: 'wrap',
                          gap: '12px',
                          marginBottom: '14px',
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin:
                                '0 0 5px',
                              fontWeight: '800',
                              fontSize: '15px',
                              color: C.black,
                            }}
                          >
                            Dispute #
                            {dispute.id.substring(
                              0,
                              8
                            )}
                          </p>

                          <p
                            style={{
                              margin:
                                '0 0 5px',
                              fontSize: '13px',
                              color: C.muted,
                            }}
                          >
                            Raised by:{' '}
                            {
                              dispute.raiser
                                ?.full_name
                            }{' '}
                            ·{' '}
                            {
                              dispute.raiser
                                ?.email
                            }
                          </p>

                          <p
                            style={{
                              margin: 0,
                              fontSize: '12px',
                              color:
                                C.lightMuted,
                            }}
                          >
                            {new Date(
                              dispute.created_at
                            ).toLocaleDateString()}
                          </p>
                        </div>

                        <span
                          style={{
                            background: resolved
                              ? C.successBg
                              : C.lateriteSoft,
                            border: `1px solid ${
                              resolved
                                ? C.success
                                : C.laterite
                            }`,
                            color: resolved
                              ? C.success
                              : C.lateriteDark,
                            fontSize: '11px',
                            fontWeight: '700',
                            padding:
                              '4px 10px',
                            borderRadius: '20px',
                            textTransform:
                              'capitalize',
                          }}
                        >
                          {dispute.status}
                        </span>
                      </div>

                      <div
                        style={{
                          background:
                            C.background,
                          borderRadius: '8px',
                          padding: '13px',
                          marginBottom: '12px',
                        }}
                      >
                        <p
                          style={{
                            margin:
                              '0 0 5px',
                            fontSize: '10px',
                            color:
                              C.lightMuted,
                            fontWeight: '800',
                            textTransform:
                              'uppercase',
                            letterSpacing:
                              '0.8px',
                          }}
                        >
                          Reason
                        </p>

                        <p
                          style={{
                            margin: 0,
                            fontSize: '14px',
                            color: C.black,
                          }}
                        >
                          {dispute.reason}
                        </p>
                      </div>

                      {resolved &&
                        dispute.resolution && (
                          <div
                            style={{
                              background:
                                C.successBg,
                              borderRadius: '8px',
                              padding: '13px',
                              marginBottom:
                                '12px',
                            }}
                          >
                            <p
                              style={{
                                margin:
                                  '0 0 5px',
                                fontSize: '10px',
                                color:
                                  C.success,
                                fontWeight: '800',
                                textTransform:
                                  'uppercase',
                              }}
                            >
                              Resolution
                            </p>

                            <p
                              style={{
                                margin: 0,
                                fontSize: '14px',
                                color:
                                  C.black,
                              }}
                            >
                              {
                                dispute.resolution
                              }
                            </p>
                          </div>
                        )}

                      {dispute.status ===
                        'open' && (
                        <div>
                          <input
                            type="text"
                            placeholder="Enter resolution..."
                            id={`resolution-${dispute.id}`}
                            style={{
                              width: '100%',
                              padding: '11px',
                              border: `1px solid ${C.border}`,
                              borderRadius:
                                '7px',
                              fontSize: '13px',
                              outline: 'none',
                              boxSizing:
                                'border-box',
                              marginBottom:
                                '10px',
                            }}
                          />

                          <button
                            onClick={() => {
                              const input =
                                document.getElementById(
                                  `resolution-${dispute.id}`
                                )

                              if (
                                input?.value
                              ) {
                                handleResolveDispute(
                                  dispute.id,
                                  input.value
                                )
                              }
                            }}
                            style={{
                              background:
                                C.black,
                              color: C.white,
                              border: 'none',
                              padding:
                                '10px 18px',
                              borderRadius:
                                '7px',
                              fontWeight: '700',
                              fontSize: '12px',
                              cursor:
                                'pointer',
                            }}
                          >
                            Mark Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            FIELD MARKETERS
        ===================================================== */}

        {activeTab === 'marketers' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: C.muted,
                  fontSize: '14px',
                }}
              >
                {marketers.length} field
                marketers
              </p>

              <button
                onClick={() =>
                  setShowMarketerForm(
                    !showMarketerForm
                  )
                }
                style={{
                  background: C.black,
                  color: C.white,
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '7px',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                + Create Field Marketer
              </button>
            </div>

            {showMarketerForm && (
              <div
                style={{
                  background: C.white,
                  border: `1px solid ${C.laterite}`,
                  borderRadius: '12px',
                  padding: '26px',
                  marginBottom: '24px',
                }}
              >
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: '800',
                    color: C.black,
                    margin:
                      '0 0 20px',
                  }}
                >
                  Create Field Marketer
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '14px',
                    marginBottom:
                      '18px',
                  }}
                >
                  {[
                    {
                      label: 'Full Name',
                      type: 'text',
                      placeholder:
                        'Field marketer name',
                      key: 'full_name',
                    },
                    {
                      label: 'Email',
                      type: 'email',
                      placeholder:
                        'their@email.com',
                      key: 'email',
                    },
                    {
                      label: 'Password',
                      type: 'text',
                      placeholder:
                        'Set their password',
                      key: 'password',
                    },
                  ].map((field) => (
                    <div key={field.key}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: C.black,
                          marginBottom:
                            '6px',
                        }}
                      >
                        {field.label}
                      </label>

                      <input
                        type={field.type}
                        placeholder={
                          field.placeholder
                        }
                        value={
                          marketerForm[
                            field.key
                          ]
                        }
                        onChange={(e) =>
                          setMarketerForm({
                            ...marketerForm,
                            [field.key]:
                              e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '11px',
                          border: `1px solid ${C.border}`,
                          borderRadius:
                            '7px',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing:
                            'border-box',
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    background:
                      C.lateriteSoft,
                    border: `1px solid ${C.laterite}`,
                    borderRadius: '7px',
                    padding: '12px',
                    marginBottom:
                      '18px',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color:
                        C.lateriteDark,
                      lineHeight: '1.6',
                    }}
                  >
                    A welcome email with
                    their login details and
                    referral code will be
                    sent automatically.
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                  }}
                >
                  <button
                    onClick={() =>
                      setShowMarketerForm(
                        false
                      )
                    }
                    style={{
                      flex: 1,
                      background:
                        C.white,
                      color: C.black,
                      border: `1px solid ${C.border}`,
                      padding: '11px',
                      borderRadius:
                        '7px',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor:
                        'pointer',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      handleCreateMarketer
                    }
                    disabled={
                      creatingMarketer
                    }
                    style={{
                      flex: 2,
                      background:
                        C.black,
                      color: C.white,
                      border: 'none',
                      padding: '11px',
                      borderRadius:
                        '7px',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor:
                        'pointer',
                    }}
                  >
                    {creatingMarketer
                      ? 'Creating & Sending Email...'
                      : 'Create Field Marketer'}
                  </button>
                </div>
              </div>
            )}

            {marketersLoading ? (
              <p style={{ color: C.muted }}>
                Loading...
              </p>
            ) : marketers.length === 0 ? (
              <div
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: '12px',
                  padding: '45px 30px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    color: C.lightMuted,
                    fontSize: '14px',
                    margin:
                      '0 0 7px',
                    fontWeight: '700',
                  }}
                >
                  No field marketers yet
                </p>

                <p
                  style={{
                    color: C.lightMuted,
                    fontSize: '12px',
                    margin: 0,
                  }}
                >
                  Create your first field
                  marketer above
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection:
                    'column',
                  gap: '12px',
                }}
              >
                {marketers.map(
                  (marketer) => (
                    <div
                      key={marketer.id}
                      style={{
                        background:
                          C.white,
                        border: `1px solid ${C.border}`,
                        borderRadius:
                          '12px',
                        padding: '20px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent:
                            'space-between',
                          alignItems:
                            'flex-start',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap: '14px',
                          }}
                        >
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius:
                                '50%',
                              background:
                                C.lateriteSoft,
                              border: `2px solid ${C.laterite}`,
                              display:
                                'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              fontWeight:
                                '800',
                              color:
                                C.laterite,
                              fontSize:
                                '18px',
                              overflow:
                                'hidden',
                              flexShrink: 0,
                            }}
                          >
                            {marketer.avatar_url ? (
                              <img
                                src={
                                  marketer.avatar_url
                                }
                                alt="avatar"
                                style={{
                                  width:
                                    '100%',
                                  height:
                                    '100%',
                                  objectFit:
                                    'cover',
                                }}
                              />
                            ) : (
                              marketer.full_name
                                ?.charAt(
                                  0
                                )
                                ?.toUpperCase() ||
                              '?'
                            )}
                          </div>

                          <div>
                            <p
                              style={{
                                margin:
                                  '0 0 4px',
                                fontWeight:
                                  '800',
                                fontSize:
                                  '15px',
                                color:
                                  C.black,
                              }}
                            >
                              {
                                marketer.full_name
                              }
                            </p>

                            <p
                              style={{
                                margin:
                                  '0 0 6px',
                                fontSize:
                                  '13px',
                                color:
                                  C.muted,
                              }}
                            >
                              {
                                marketer.email
                              }
                            </p>

                            <div
                              style={{
                                display:
                                  'flex',
                                gap: '8px',
                                flexWrap:
                                  'wrap',
                              }}
                            >
                              <span
                                style={{
                                  background:
                                    C.lateriteSoft,
                                  border: `1px solid ${C.laterite}`,
                                  color:
                                    C.lateriteDark,
                                  fontSize:
                                    '11px',
                                  fontWeight:
                                    '800',
                                  padding:
                                    '3px 9px',
                                  borderRadius:
                                    '20px',
                                  letterSpacing:
                                    '0.8px',
                                }}
                              >
                                {
                                  marketer.referral_code
                                }
                              </span>

                              <span
                                style={{
                                  background:
                                    C.background,
                                  color:
                                    C.muted,
                                  fontSize:
                                    '11px',
                                  padding:
                                    '3px 9px',
                                  borderRadius:
                                    '20px',
                                }}
                              >
                                {marketer
                                  .signups
                                  ?.length ||
                                  0}{' '}
                                referrals
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            handleDeleteMarketer(
                              marketer.id
                            )
                          }
                          disabled={
                            deletingMarketer ===
                            marketer.id
                          }
                          style={{
                            background:
                              C.dangerBg,
                            color:
                              C.danger,
                            border: `1px solid ${C.danger}`,
                            padding:
                              '8px 15px',
                            borderRadius:
                              '7px',
                            fontWeight:
                              '700',
                            fontSize:
                              '12px',
                            cursor:
                              'pointer',
                          }}
                        >
                          {deletingMarketer ===
                          marketer.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </div>

                      {marketer.signups &&
                        marketer.signups.length >
                          0 && (
                          <div
                            style={{
                              marginTop:
                                '16px',
                              paddingTop:
                                '16px',
                              borderTop: `1px solid ${C.border}`,
                            }}
                          >
                            <p
                              style={{
                                fontSize:
                                  '12px',
                                fontWeight:
                                  '800',
                                color:
                                  C.black,
                                marginBottom:
                                  '10px',
                              }}
                            >
                              Referred Users
                            </p>

                            <div
                              style={{
                                display:
                                  'flex',
                                flexDirection:
                                  'column',
                                gap: '6px',
                              }}
                            >
                              {marketer.signups.map(
                                (
                                  signup
                                ) => (
                                  <div
                                    key={
                                      signup.id
                                    }
                                    style={{
                                      display:
                                        'flex',
                                      justifyContent:
                                        'space-between',
                                      gap: '10px',
                                      flexWrap:
                                        'wrap',
                                      fontSize:
                                        '12px',
                                      color:
                                        C.muted,
                                      background:
                                        C.background,
                                      padding:
                                        '8px 12px',
                                      borderRadius:
                                        '7px',
                                    }}
                                  >
                                    <span>
                                      {
                                        signup.referred_user_name
                                      }
                                    </span>

                                    <span
                                      style={{
                                        textTransform:
                                          'capitalize',
                                      }}
                                    >
                                      {signup.referred_user_role?.replace(
                                        '_',
                                        ' '
                                      )}
                                    </span>

                                    <span>
                                      {new Date(
                                        signup.created_at
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      <div
                        style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: `1px solid ${C.border}`,
                        }}
                      >
                        <p
                          style={{
                            fontSize: '11px',
                            color:
                              C.lightMuted,
                            margin: 0,
                          }}
                        >
                          Referral link:{' '}
                          <span
                            style={{
                              color:
                                C.laterite,
                              fontWeight:
                                '700',
                            }}
                          >
                            engediafrica.com/signup?ref=
                            {
                              marketer.referral_code
                            }
                          </span>
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            TRAINING
        ===================================================== */}

        {activeTab === 'training' && (
          <div>
            {trainingLoading ? (
              <p style={{ color: C.muted }}>
                Loading...
              </p>
            ) : Object.keys(
                trainingByUser
              ).length === 0 ? (
              <div
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: '12px',
                  padding: '45px 30px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    color: C.lightMuted,
                    fontSize: '14px',
                    margin: 0,
                  }}
                >
                  No artisans have completed
                  any training modules yet.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection:
                    'column',
                  gap: '12px',
                }}
              >
                {Object.values(
                  trainingByUser
                ).map(
                  ({ user, modules }) => {
                    const completed =
                      modules.length

                    const allDone =
                      completed >=
                      TOTAL_MODULES

                    const percentage =
                      Math.min(
                        (completed /
                          TOTAL_MODULES) *
                          100,
                        100
                      )

                    return (
                      <div
                        key={
                          modules[0]
                            .user_id
                        }
                        style={{
                          background:
                            C.white,
                          border: `1px solid ${
                            allDone
                              ? C.laterite
                              : C.border
                          }`,
                          borderRadius:
                            '12px',
                          padding:
                            '20px',
                        }}
                      >
                        <div
                          style={{
                            display:
                              'flex',
                            justifyContent:
                              'space-between',
                            alignItems:
                              'center',
                            flexWrap:
                              'wrap',
                            gap: '12px',
                          }}
                        >
                          <div
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'center',
                              gap: '12px',
                            }}
                          >
                            <div
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius:
                                  '50%',
                                background:
                                  C.lateriteSoft,
                                border: `2px solid ${C.laterite}`,
                                display:
                                  'flex',
                                alignItems:
                                  'center',
                                justifyContent:
                                  'center',
                                fontWeight:
                                  '800',
                                color:
                                  C.laterite,
                                fontSize:
                                  '16px',
                                overflow:
                                  'hidden',
                                flexShrink: 0,
                              }}
                            >
                              {user?.avatar_url ? (
                                <img
                                  src={
                                    user.avatar_url
                                  }
                                  alt="avatar"
                                  style={{
                                    width:
                                      '100%',
                                    height:
                                      '100%',
                                    objectFit:
                                      'cover',
                                  }}
                                />
                              ) : (
                                user?.full_name
                                  ?.charAt(
                                    0
                                  )
                                  ?.toUpperCase() ||
                                '?'
                              )}
                            </div>

                            <div>
                              <div
                                style={{
                                  display:
                                    'flex',
                                  alignItems:
                                    'center',
                                  gap: '8px',
                                  flexWrap:
                                    'wrap',
                                }}
                              >
                                <p
                                  style={{
                                    margin: 0,
                                    fontWeight:
                                      '800',
                                    fontSize:
                                      '15px',
                                    color:
                                      C.black,
                                  }}
                                >
                                  {
                                    user?.full_name
                                  }
                                </p>

                                {allDone && (
                                  <span
                                    style={{
                                      background:
                                        C.lateriteSoft,
                                      border: `1px solid ${C.laterite}`,
                                      color:
                                        C.lateriteDark,
                                      fontSize:
                                        '10px',
                                      fontWeight:
                                        '800',
                                      padding:
                                        '3px 8px',
                                      borderRadius:
                                        '20px',
                                    }}
                                  >
                                    CERTIFIED
                                  </span>
                                )}
                              </div>

                              <p
                                style={{
                                  margin:
                                    '3px 0 0',
                                  fontSize:
                                    '12px',
                                  color:
                                    C.muted,
                                }}
                              >
                                {user?.email}
                              </p>
                            </div>
                          </div>

                          <div
                            style={{
                              textAlign:
                                'right',
                            }}
                          >
                            <p
                              style={{
                                margin:
                                  '0 0 6px',
                                fontSize:
                                  '15px',
                                fontWeight:
                                  '800',
                                color:
                                  C.black,
                              }}
                            >
                              {completed}/
                              {
                                TOTAL_MODULES
                              }{' '}
                              modules
                            </p>

                            <div
                              style={{
                                background:
                                  C.border,
                                borderRadius:
                                  '20px',
                                height: '6px',
                                width: '120px',
                                overflow:
                                  'hidden',
                              }}
                            >
                              <div
                                style={{
                                  background:
                                    allDone
                                      ? C.black
                                      : C.laterite,
                                  height:
                                    '100%',
                                  borderRadius:
                                    '20px',
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            USERS / PENDING
        ===================================================== */}

        {(activeTab === 'users' ||
          activeTab === 'pending') && (
          <div
            style={{
              display: 'flex',
              flexDirection:
                'column',
              gap: '12px',
            }}
          >
            {(activeTab === 'pending'
              ? pendingVerification
              : users
            ).map((user) => (
              <div
                key={user.id}
                style={{
                  background: C.white,
                  border: `1px solid ${
                    selected?.id ===
                    user.id
                      ? C.laterite
                      : C.border
                  }`,
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow:
                    selected?.id ===
                    user.id
                      ? '0 4px 15px rgba(139,94,60,0.08)'
                      : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems:
                      'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      display:
                        'flex',
                      gap: '14px',
                      alignItems:
                        'center',
                    }}
                  >
                    {/* Avatar */}

                    <div
                      style={{
                        position:
                          'relative',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius:
                            '50%',
                          background:
                            C.lateriteSoft,
                          border: `2px solid ${
                            user.is_verified
                              ? C.black
                              : C.laterite
                          }`,
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          fontWeight:
                            '800',
                          color:
                            C.laterite,
                          fontSize:
                            '18px',
                          overflow:
                            'hidden',
                        }}
                      >
                        {user.avatar_url ? (
                          <img
                            src={
                              user.avatar_url
                            }
                            alt="avatar"
                            style={{
                              width:
                                '100%',
                              height:
                                '100%',
                              objectFit:
                                'cover',
                            }}
                          />
                        ) : (
                          user.full_name
                            ?.charAt(
                              0
                            )
                            ?.toUpperCase() ||
                          '?'
                        )}
                      </div>

                      {user.is_verified && (
                        <div
                          style={{
                            position:
                              'absolute',
                            bottom: 0,
                            right: 0,
                            width: '16px',
                            height: '16px',
                            borderRadius:
                              '50%',
                            background:
                              C.black,
                            border: `2px solid ${C.white}`,
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                          }}
                        >
                          <span
                            style={{
                              color:
                                C.white,
                              fontSize:
                                '9px',
                              fontWeight:
                                '800',
                            }}
                          >
                            ✓
                          </span>
                        </div>
                      )}
                    </div>

                    {/* User info */}

                    <div>
                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: '7px',
                          flexWrap:
                            'wrap',
                          marginBottom:
                            '4px',
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontWeight:
                              '800',
                            fontSize:
                              '15px',
                            color:
                              C.black,
                          }}
                        >
                          {user.full_name ||
                            'No name'}
                        </p>

                        {user.is_admin && (
                          <span
                            style={{
                              background:
                                C.black,
                              color:
                                C.white,
                              fontSize:
                                '9px',
                              fontWeight:
                                '800',
                              padding:
                                '3px 7px',
                              borderRadius:
                                '20px',
                              letterSpacing:
                                '0.5px',
                            }}
                          >
                            ADMIN
                          </span>
                        )}

                        {user.is_verified && (
                          <span
                            style={{
                              background:
                                C.lateriteSoft,
                              border: `1px solid ${C.laterite}`,
                              color:
                                C.lateriteDark,
                              fontSize:
                                '9px',
                              fontWeight:
                                '800',
                              padding:
                                '3px 7px',
                              borderRadius:
                                '20px',
                            }}
                          >
                            VERIFIED
                          </span>
                        )}
                      </div>

                      <p
                        style={{
                          margin:
                            '0 0 8px',
                          fontSize:
                            '13px',
                          color:
                            C.muted,
                        }}
                      >
                        {user.email}
                      </p>

                      <div
                        style={{
                          display:
                            'flex',
                          gap: '6px',
                          flexWrap:
                            'wrap',
                        }}
                      >
                        <span
                          style={{
                            background:
                              C.lateriteSoft,
                            border: `1px solid ${C.laterite}`,
                            color:
                              C.lateriteDark,
                            fontSize:
                              '10px',
                            fontWeight:
                              '700',
                            padding:
                              '3px 8px',
                            borderRadius:
                              '20px',
                          }}
                        >
                          {roleLabel[
                            user.role
                          ] ||
                            user.role ||
                            'No role'}
                        </span>

                        <span
                          style={{
                            background:
                              user.verification_status ===
                              'approved'
                                ? C.successBg
                                : user.verification_status ===
                                  'rejected'
                                ? C.dangerBg
                                : C.warningBg,
                            border: `1px solid ${
                              user.verification_status ===
                              'approved'
                                ? C.success
                                : user.verification_status ===
                                  'rejected'
                                ? C.danger
                                : C.warning
                            }`,
                            color:
                              user.verification_status ===
                              'approved'
                                ? C.success
                                : user.verification_status ===
                                  'rejected'
                                ? C.danger
                                : C.warning,
                            fontSize:
                              '10px',
                            fontWeight:
                              '700',
                            padding:
                              '3px 8px',
                            borderRadius:
                              '20px',
                          }}
                        >
                          {user.verification_status ||
                            'pending'}
                        </span>

                        {user.documents_submitted && (
                          <span
                            style={{
                              background:
                                C.background,
                              border: `1px solid ${C.border}`,
                              color:
                                C.muted,
                              fontSize:
                                '10px',
                              fontWeight:
                                '700',
                              padding:
                                '3px 8px',
                              borderRadius:
                                '20px',
                            }}
                          >
                            Docs Submitted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Review */}

                  <button
                    onClick={() =>
                      handleSelect(user)
                    }
                    style={{
                      background:
                        selected?.id ===
                        user.id
                          ? C.black
                          : C.lateriteSoft,
                      border: `1px solid ${
                        selected?.id ===
                        user.id
                          ? C.black
                          : C.laterite
                      }`,
                      color:
                        selected?.id ===
                        user.id
                          ? C.white
                          : C.lateriteDark,
                      padding:
                        '8px 16px',
                      borderRadius:
                        '7px',
                      cursor:
                        'pointer',
                      fontSize:
                        '12px',
                      fontWeight:
                        '700',
                    }}
                  >
                    {selected?.id ===
                    user.id
                      ? 'Close'
                      : 'Review'}
                  </button>
                </div>

                {/* =================================================
                    USER REVIEW PANEL
                ================================================= */}

                {selected?.id ===
                  user.id && (
                  <div
                    style={{
                      marginTop:
                        '24px',
                      paddingTop:
                        '24px',
                      borderTop: `1px solid ${C.border}`,
                    }}
                  >
                    {/* User details */}

                    <div
                      style={{
                        display:
                          'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '9px',
                        marginBottom:
                          '20px',
                      }}
                    >
                      {[
                        {
                          label: 'Phone',
                          value:
                            user.phone,
                        },
                        {
                          label: 'City',
                          value:
                            user.city,
                        },
                        {
                          label: 'State',
                          value:
                            user.state,
                        },
                        {
                          label: 'Company',
                          value:
                            user.company_name,
                        },
                        {
                          label:
                            'Experience',
                          value:
                            user.experience_years
                              ? `${user.experience_years} years`
                              : null,
                        },
                        {
                          label:
                            'Professional Body',
                          value:
                            user.professional_body,
                        },
                        {
                          label:
                            'License Number',
                          value:
                            user.professional_license_number,
                        },
                        {
                          label:
                            'CAC Number',
                          value:
                            user.cac_number,
                        },
                      ]
                        .filter(
                          (field) =>
                            field.value
                        )
                        .map(
                          (field) => (
                            <div
                              key={
                                field.label
                              }
                              style={{
                                background:
                                  C.background,
                                padding:
                                  '11px 12px',
                                borderRadius:
                                  '7px',
                              }}
                            >
                              <p
                                style={{
                                  margin:
                                    '0 0 3px',
                                  fontSize:
                                    '9px',
                                  color:
                                    C.lightMuted,
                                  fontWeight:
                                    '800',
                                  textTransform:
                                    'uppercase',
                                  letterSpacing:
                                    '0.6px',
                                }}
                              >
                                {
                                  field.label
                                }
                              </p>

                              <p
                                style={{
                                  margin: 0,
                                  fontSize:
                                    '13px',
                                  color:
                                    C.black,
                                  fontWeight:
                                    '600',
                                }}
                              >
                                {
                                  field.value
                                }
                              </p>
                            </div>
                          )
                        )}
                    </div>

                    {/* Bio */}

                    {user.bio && (
                      <div
                        style={{
                          background:
                            C.background,
                          padding: '15px',
                          borderRadius:
                            '8px',
                          marginBottom:
                            '20px',
                        }}
                      >
                        <p
                          style={{
                            margin:
                              '0 0 6px',
                            fontSize:
                              '10px',
                            color:
                              C.lightMuted,
                            fontWeight:
                              '800',
                            textTransform:
                              'uppercase',
                          }}
                        >
                          Bio
                        </p>

                        <p
                          style={{
                            margin: 0,
                            fontSize:
                              '14px',
                            color:
                              C.black,
                            lineHeight:
                              '1.6',
                          }}
                        >
                          {user.bio}
                        </p>
                      </div>
                    )}

                    {/* Documents */}

                    <div
                      style={{
                        marginBottom:
                          '20px',
                      }}
                    >
                      <p
                        style={{
                          fontSize:
                            '13px',
                          fontWeight:
                            '800',
                          color:
                            C.black,
                          marginBottom:
                            '12px',
                        }}
                      >
                        Uploaded Documents
                      </p>

                      {loadingDocs ? (
                        <p
                          style={{
                            color:
                              C.lightMuted,
                            fontSize:
                              '13px',
                          }}
                        >
                          Loading...
                        </p>
                      ) : (
                        <div
                          style={{
                            display:
                              'flex',
                            flexDirection:
                              'column',
                            gap: '8px',
                          }}
                        >
                          {/* Government ID */}

                          {docUrls.id ? (
                            <a
                              href={
                                docUrls.id
                              }
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display:
                                  'flex',
                                alignItems:
                                  'center',
                                gap: '12px',
                                background:
                                  C.background,
                                padding:
                                  '14px',
                                borderRadius:
                                  '9px',
                                textDecoration:
                                  'none',
                                border: `1px solid ${C.border}`,
                              }}
                            >
                              <span
                                style={{
                                  fontSize:
                                    '20px',
                                }}
                              >
                                🪪
                              </span>

                              <div>
                                <p
                                  style={{
                                    margin:
                                      '0 0 2px',
                                    fontSize:
                                      '13px',
                                    fontWeight:
                                      '800',
                                    color:
                                      C.black,
                                  }}
                                >
                                  Government
                                  ID
                                </p>

                                <p
                                  style={{
                                    margin: 0,
                                    fontSize:
                                      '11px',
                                    color:
                                      C.laterite,
                                    fontWeight:
                                      '700',
                                  }}
                                >
                                  Click to
                                  view →
                                </p>
                              </div>
                            </a>
                          ) : (
                            <div
                              style={{
                                background:
                                  C.background,
                                padding:
                                  '14px',
                                borderRadius:
                                  '9px',
                                border: `1px solid ${C.border}`,
                              }}
                            >
                              <p
                                style={{
                                  margin: 0,
                                  fontSize:
                                    '12px',
                                  color:
                                    C.lightMuted,
                                }}
                              >
                                🪪 No government
                                ID uploaded
                              </p>
                            </div>
                          )}

                          {/* CAC */}

                          {user.cac_document_url &&
                            docUrls.cac && (
                              <a
                                href={
                                  docUrls.cac
                                }
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display:
                                    'flex',
                                  alignItems:
                                    'center',
                                  gap: '12px',
                                  background:
                                    C.background,
                                  padding:
                                    '14px',
                                  borderRadius:
                                    '9px',
                                  textDecoration:
                                    'none',
                                  border: `1px solid ${C.border}`,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize:
                                      '20px',
                                  }}
                                >
                                  🏢
                                </span>

                                <div>
                                  <p
                                    style={{
                                      margin:
                                        '0 0 2px',
                                      fontSize:
                                        '13px',
                                      fontWeight:
                                        '800',
                                      color:
                                        C.black,
                                    }}
                                  >
                                    CAC
                                    Certificate
                                  </p>

                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize:
                                        '11px',
                                      color:
                                        C.laterite,
                                      fontWeight:
                                        '700',
                                    }}
                                  >
                                    Click to
                                    view →
                                  </p>
                                </div>
                              </a>
                            )}

                          {/* License */}

                          {user.professional_license_url &&
                            docUrls.license && (
                              <a
                                href={
                                  docUrls.license
                                }
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display:
                                    'flex',
                                  alignItems:
                                    'center',
                                  gap: '12px',
                                  background:
                                    C.background,
                                  padding:
                                    '14px',
                                  borderRadius:
                                    '9px',
                                  textDecoration:
                                    'none',
                                  border: `1px solid ${C.border}`,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize:
                                      '20px',
                                  }}
                                >
                                  📋
                                </span>

                                <div>
                                  <p
                                    style={{
                                      margin:
                                        '0 0 2px',
                                      fontSize:
                                        '13px',
                                      fontWeight:
                                        '800',
                                      color:
                                        C.black,
                                    }}
                                  >
                                    Professional
                                    License
                                  </p>

                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize:
                                        '11px',
                                      color:
                                        C.laterite,
                                      fontWeight:
                                        '700',
                                    }}
                                  >
                                    Click to
                                    view →
                                  </p>
                                </div>
                              </a>
                            )}

                          {!user.id_document_url &&
                            !user.cac_document_url &&
                            !user.professional_license_url && (
                              <p
                                style={{
                                  color:
                                    C.lightMuted,
                                  fontSize:
                                    '12px',
                                  margin: 0,
                                }}
                              >
                                No documents
                                uploaded yet
                              </p>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Admin Note */}

                    <div
                      style={{
                        marginBottom:
                          '16px',
                      }}
                    >
                      <label
                        style={{
                          display:
                            'block',
                          fontSize:
                            '12px',
                          fontWeight:
                            '700',
                          color:
                            C.black,
                          marginBottom:
                            '6px',
                        }}
                      >
                        Admin Note
                      </label>

                      <input
                        type="text"
                        value={note}
                        onChange={(e) =>
                          setNote(
                            e.target.value
                          )
                        }
                        placeholder="Reason for approval or rejection..."
                        style={{
                          width: '100%',
                          padding:
                            '11px',
                          border: `1px solid ${C.border}`,
                          borderRadius:
                            '7px',
                          fontSize:
                            '13px',
                          outline:
                            'none',
                          boxSizing:
                            'border-box',
                        }}
                      />
                    </div>

                    {/* Verification buttons */}

                    <div
                      style={{
                        display:
                          'flex',
                        gap: '8px',
                        flexWrap:
                          'wrap',
                      }}
                    >
                      <button
                        onClick={() =>
                          handleVerify(
                            user.id,
                            'approved'
                          )
                        }
                        style={{
                          background:
                            C.black,
                          color:
                            C.white,
                          border:
                            'none',
                          padding:
                            '11px 20px',
                          borderRadius:
                            '7px',
                          cursor:
                            'pointer',
                          fontWeight:
                            '700',
                          fontSize:
                            '12px',
                        }}
                      >
                        ✓ Approve
                      </button>

                      <button
                        onClick={() =>
                          handleVerify(
                            user.id,
                            'rejected'
                          )
                        }
                        style={{
                          background:
                            C.dangerBg,
                          color:
                            C.danger,
                          border: `1px solid ${C.danger}`,
                          padding:
                            '11px 20px',
                          borderRadius:
                            '7px',
                          cursor:
                            'pointer',
                          fontWeight:
                            '700',
                          fontSize:
                            '12px',
                        }}
                      >
                        Reject
                      </button>

                      <button
                        onClick={() =>
                          handleVerify(
                            user.id,
                            'pending'
                          )
                        }
                        style={{
                          background:
                            C.white,
                          color:
                            C.lateriteDark,
                          border: `1px solid ${C.laterite}`,
                          padding:
                            '11px 20px',
                          borderRadius:
                            '7px',
                          cursor:
                            'pointer',
                          fontWeight:
                            '700',
                          fontSize:
                            '12px',
                        }}
                      >
                        Reset to Pending
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Empty pending state */}

            {activeTab ===
              'pending' &&
              pendingVerification.length ===
                0 && (
                <div
                  style={{
                    background:
                      C.white,
                    border: `1px solid ${C.border}`,
                    borderRadius:
                      '12px',
                    padding:
                      '50px 30px',
                    textAlign:
                      'center',
                  }}
                >
                  <p
                    style={{
                      color:
                        C.lightMuted,
                      fontSize:
                        '14px',
                      margin: 0,
                      fontWeight:
                        '700',
                    }}
                  >
                    No pending
                    verifications
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  )
}