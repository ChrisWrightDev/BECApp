export const useAuth = () => {
  // Get Supabase client - handle case where it might not be available yet
  let supabase
  try {
    supabase = useSupabaseClient()
  } catch (error) {
    console.warn('Supabase client not available yet:', error)
    // Return a minimal interface if Supabase isn't ready
    return {
      user: ref(null),
      profile: ref(null),
      loading: ref(false),
      sessionInitialized: ref(false),
      signIn: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') }),
      signOut: () => Promise.resolve({ error: new Error('Supabase not initialized') }),
      getSession: () => Promise.resolve({ session: null, error: new Error('Supabase not initialized') }),
      getUserRole: () => 'worker',
      isAdmin: () => false,
      fetchProfile: () => Promise.resolve(null),
      updateProfile: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') })
    }
  }
  
  const user = useState('user', () => null)
  const profile = useState('userProfile', () => null)
  const loading = useState('authLoading', () => false)
  const sessionInitialized = useState('sessionInitialized', () => false)

  const fetchProfile = async (userId) => {
    if (!userId) {
      profile.value = null
      return null
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching profile:', error)
        profile.value = null
        return null
      }
      
      profile.value = data
      return data
    } catch (err) {
      console.error('Error fetching profile:', err)
      profile.value = null
      return null
    }
  }

  const signIn = async (email, password) => {
    try {
      loading.value = true
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      user.value = data.user
      sessionInitialized.value = true
      // Fetch profile after sign in
      if (data.user) {
        await fetchProfile(data.user.id)
      }
      return { data, error: null }
    } catch (error) {
      sessionInitialized.value = true
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  const signUp = async (email, password, metadata = {}) => {
    try {
      loading.value = true
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstname: metadata.firstname || '',
            lastname: metadata.lastname || '',
            role: metadata.role || 'worker'
          }
        }
      })
      if (error) throw error
      user.value = data.user
      sessionInitialized.value = true
      // Profile will be created by trigger, but fetch it if available
      if (data.user) {
        await fetchProfile(data.user.id)
      }
      return { data, error: null }
    } catch (error) {
      sessionInitialized.value = true
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  const signOut = async () => {
    try {
      loading.value = true
      
      // Record logout time before signing out
      try {
        const { recordLogout } = useSessions()
        await recordLogout()
      } catch (sessionError) {
        console.warn('Error recording logout session:', sessionError)
        // Continue with logout even if session recording fails
      }
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      user.value = null
      profile.value = null
      sessionInitialized.value = true // Mark as initialized even after signout
      return { error: null }
    } catch (error) {
      sessionInitialized.value = true
      return { error }
    } finally {
      loading.value = false
    }
  }

  const getSession = async () => {
    // Check if supabase is available
    if (!supabase || !supabase.auth) {
      console.warn('Supabase client not available in getSession')
      sessionInitialized.value = true
      return { session: null, error: new Error('Supabase not initialized') }
    }

    // If already initialized and we have a user, return early
    if (sessionInitialized.value && user.value) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        return { session, error: null }
      } catch (error) {
        return { session: null, error }
      }
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('getSession error:', error)
        sessionInitialized.value = true
        return { session: null, error }
      }
      
      user.value = session?.user ?? null
      
      // Fetch profile if user is logged in
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        profile.value = null
      }
      
      sessionInitialized.value = true
      return { session, error: null }
    } catch (error) {
      console.error('getSession exception:', error)
      sessionInitialized.value = true
      return { session: null, error }
    }
  }

  const getUserRole = () => {
    // First try to get role from profile
    if (profile.value?.role) {
      return profile.value.role
    }
    // Fallback to user_metadata for backwards compatibility
    return user.value?.user_metadata?.role || 'worker'
  }

  const isAdmin = () => {
    return getUserRole() === 'admin'
  }

  const updateProfile = async (updates) => {
    if (!user.value?.id) {
      return { data: null, error: new Error('User not authenticated') }
    }
    try {
      loading.value = true
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .single()
      
      if (error) throw error
      profile.value = data
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  // Initialize auth state listener (but don't call getSession here - let plugin handle it)
  if (process.client && supabase) {
    supabase.auth.onAuthStateChange(async (event, session) => {
      user.value = session?.user ?? null
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        profile.value = null
      }
      sessionInitialized.value = true
    })
  }

  return {
    user: readonly(user),
    profile: readonly(profile),
    loading: readonly(loading),
    sessionInitialized: readonly(sessionInitialized),
    signIn,
    signUp,
    signOut,
    getSession,
    getUserRole,
    isAdmin,
    fetchProfile,
    updateProfile
  }
}

