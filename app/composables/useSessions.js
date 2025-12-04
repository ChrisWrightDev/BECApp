export const useSessions = () => {
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  
  const currentSession = useState('currentSession', () => null)
  const loading = useState('sessionsLoading', () => false)
  const error = useState('sessionsError', () => null)

  // Record user login
  const recordLogin = async () => {
    if (!user.value?.id) {
      return { data: null, error: new Error('User not authenticated') }
    }

    try {
      loading.value = true
      error.value = null

      // Check if there's an open session (no logout_time)
      const { data: existingSession } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.value.id)
        .is('logout_time', null)
        .order('login_time', { ascending: false })
        .limit(1)
        .single()

      // If there's an open session, don't create a new one
      if (existingSession) {
        currentSession.value = existingSession
        return { data: existingSession, error: null }
      }

      // Create new session
      const { data, error: insertError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.value.id,
          login_time: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) throw insertError

      currentSession.value = data
      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error recording login:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Record user logout
  const recordLogout = async () => {
    if (!user.value?.id) {
      return { data: null, error: new Error('User not authenticated') }
    }

    try {
      loading.value = true
      error.value = null

      // Find the current open session
      const { data: openSession } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.value.id)
        .is('logout_time', null)
        .order('login_time', { ascending: false })
        .limit(1)
        .single()

      if (!openSession) {
        return { data: null, error: new Error('No open session found') }
      }

      // Update session with logout time
      const { data, error: updateError } = await supabase
        .from('user_sessions')
        .update({
          logout_time: new Date().toISOString()
        })
        .eq('id', openSession.id)
        .select()
        .single()

      if (updateError) throw updateError

      currentSession.value = null
      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error recording logout:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Get user's sessions for payroll
  const getUserSessions = async (startDate = null, endDate = null) => {
    if (!user.value?.id) {
      return { data: null, error: new Error('User not authenticated') }
    }

    try {
      loading.value = true
      error.value = null

      let query = supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.value.id)
        .order('login_time', { ascending: false })

      if (startDate) {
        query = query.gte('login_time', startDate)
      }
      if (endDate) {
        query = query.lte('login_time', endDate)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching user sessions:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  return {
    currentSession,
    loading,
    error,
    recordLogin,
    recordLogout,
    getUserSessions
  }
}

