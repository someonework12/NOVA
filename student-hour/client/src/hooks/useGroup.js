import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.jsx'

export function useGroup() {
  const { profile } = useAuth()
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.group_id) { setLoading(false); return }

    async function fetchGroup() {
      const { data: grp } = await supabase
        .from('groups')
        .select('*')
        .eq('id', profile.group_id)
        .single()

      const { data: mem } = await supabase
        .from('profiles')
        .select('id, full_name, department')
        .eq('group_id', profile.group_id)

      setGroup(grp)
      setMembers(mem || [])
      setLoading(false)
    }

    fetchGroup()
  }, [profile?.group_id])

  return { group, members, loading }
}
