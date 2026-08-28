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

            // Deactivation overrides everything, including admin status —
            // if an account has been deactivated, it stays locked regardless of role.
            if (profile.is_active === false) {
                if (!cancelled) { setLocked('deactivated');
                    setChecking(false) }
                return
            }

            if (profile.is_admin) {
                if (!cancelled) { setLocked(false);
                    setChecking(false) }
                return
            }

            if (profile.profile_completed !== true) {
                if (!cancelled) { setLocked('profile');
                    setChecking(false) }
                return
            }

            if (profile.role === 'artisan' && !allowIncompleteTraining) {
                const { count } = await supabase
                    .from('training_completions')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', profile.id)
                    .eq('passed', true)

                if (!cancelled) {
                    if ((count || 0) < TOTAL_TRAINING_MODULES) {
                        setLocked('training')
                    } else {
                        setLocked(false)
                    }
                    setChecking(false)
                }
                return
            }

            if (!cancelled) { setLocked(false);
                setChecking(false) }
        }

        check()
        return () => { cancelled = true }
    }, [profile ? .id, profile ? .profile_completed, profile ? .role, profile ? .is_admin, profile ? .is_active, allowIncompleteTraining])

    return { locked, checking }
}