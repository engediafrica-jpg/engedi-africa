'use client'
import { useEffect, useState } from 'react'

const C = {
  surface: '#15120e', raised: '#201a14', sunk: '#0f0c09',
  text: '#f1eae0', muted: '#a79a85', line: '#362d22',
  clay: '#e08554', oasis: '#86a98b', danger: '#e2695f', dangerSoft: '#2e1712',
}

export default function PortfolioSection({ profileId, isOwner, supabase }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [captionDraft, setCaptionDraft] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('user_id', profileId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true })
      setImages(data || [])
      setLoading(false)
    }
    load()
  }, [profileId])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) { setError('Please choose an image file'); return }
    if (file.size > 8 * 1024 * 1024) { setError('Image must be under 8MB'); return }

    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const path = `${profileId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('portfolio').upload(path, file)
    if (uploadError) { setError('Upload failed: ' + uploadError.message); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(path)

    const { data: inserted, error: insertError } = await supabase
      .from('portfolio_images')
      .insert({
        user_id: profileId,
        image_url: urlData.publicUrl,
        caption: captionDraft || null,
        order_index: images.length,
      })
      .select()
      .single()

    if (insertError) { setError('Could not save image: ' + insertError.message); setUploading(false); return }

    setImages([...images, inserted])
    setCaptionDraft('')
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (image) => {
    if (!confirm('Delete this photo from your portfolio?')) return
    setDeletingId(image.id)

    const path = image.image_url.split('/portfolio/')[1]
    if (path) {
      await supabase.storage.from('portfolio').remove([path])
    }

    const { error: deleteError } = await supabase.from('portfolio_images').delete().eq('id', image.id)
    if (!deleteError) {
      setImages(images.filter(img => img.id !== image.id))
    } else {
      setError('Could not delete image')
    }
    setDeletingId(null)
  }

  if (loading) return null
  if (images.length === 0 && !isOwner) return null

  return (
    <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: '700', color: C.muted, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Portfolio {images.length > 0 && `(${images.length})`}
      </h3>

      {isOwner && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Caption (optional)"
              value={captionDraft}
              onChange={e => setCaptionDraft(e.target.value)}
              style={{ flex: '1 1 200px', padding: '10px 12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '13px', outline: 'none', color: C.text }}
            />
            <label style={{ background: C.clay, color: C.sunk, border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? 'Uploading...' : '+ Add Photo'}
              <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
            </label>
          </div>
          {error && <p style={{ color: C.danger, fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>{error}</p>}
        </div>
      )}

      {images.length === 0 ? (
        <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>
          {isOwner ? 'Add photos of your completed work to build trust with clients' : 'No portfolio photos yet'}
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
          {images.map(img => (
            <div key={img.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: C.sunk }}>
              <img src={img.image_url} alt={img.caption || 'Portfolio work'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {img.caption && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '16px 8px 6px' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#fff', lineHeight: '1.3' }}>{img.caption}</p>
                </div>
              )}
              {isOwner && (
                <button
                  onClick={() => handleDelete(img)}
                  disabled={deletingId === img.id}
                  style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '6px', width: '24px', height: '24px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {deletingId === img.id ? '...' : '✕'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}