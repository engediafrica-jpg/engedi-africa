'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const TOTAL_TRAINING_MODULES = 5

export default function useAccessGate(profile, { allowIncompleteTraining = false } = {}) {
  const supabase = createClient()
  const [locked, setLocked] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (!profile) return

      if (profile.is_admin) {
        if (!cancelled) { setLocked(false); setChecking(false) }
        return
      }

      if (profile.profile_completed !== true) {
        if (!cancelled) { setLocked('profile'); setChecking(false) }
        return
      }

      if (profile.role === 'artisan' && !allowIncompleteTraining) {
        const { count } = await supabase
          .from('training_completions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('passed', true)
        if (!cancelled) {
          setLocked((count || 0) < TOTAL_TRAINING_MODULES ? 'training' : false)
          setChecking(false)
        }
        return
      }

      if (!cancelled) { setLocked(false); setChecking(false) }
    }

    check()
    return () => { cancelled = true }
  }, [profile?.id, profile?.profile_completed, profile?.role, profile?.is_admin, allowIncompleteTraining])

  return { locked, checking }
}
