import { LOAD_TIMEOUT_MS, withTimeout } from '~/utils/loadState'

const SIGN_IN_TIMEOUT_MESSAGE = 'Sign in is taking too long. Check your connection and try again.'

let profileInFlight = null
let profileInFlightId = null
let profileCacheId = null
let sessionInitPromise = null

export function resetProfileCache() {
  profileInFlight = null
  profileInFlightId = null
  profileCacheId = null
}

export function startSessionInit(factory) {
  if (!sessionInitPromise) {
    sessionInitPromise = Promise.resolve().then(factory)
  }
  return sessionInitPromise
}

export function ensureSessionInitialized() {
  if (sessionInitPromise) return sessionInitPromise

  sessionInitPromise = (async () => {
    try {
      const { getSession } = useAuth()
      return await getSession()
    } catch (error) {
      try {
        useState('sessionInitialized', () => false).value = true
      } catch {
        // useState may be unavailable outside of a Nuxt context
      }
      return { session: null, error }
    }
  })()

  return sessionInitPromise
}

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
      updateProfile: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') }),
      ensureSessionInitialized: () => Promise.resolve({ session: null, error: new Error('Supabase not initialized') })
    }
  }

  const user = useState('user', () => null)
  const profile = useState('userProfile', () => null)
  const loading = useState('authLoading', () => false)
  const sessionInitialized = useState('sessionInitialized', () => false)

  const fetchProfile = async (userId) => {
    if (!userId) {
      profile.value = null
      resetProfileCache()
      return null
    }

    if (profileCacheId === userId && profile.value) {
      return profile.value
    }

    if (profileInFlight && profileInFlightId === userId) {
      return profileInFlight
    }

    let request
    profileInFlightId = userId
    request = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error fetching profile:', error)
          if (profileCacheId !== userId) {
            profile.value = null
          }
          return null
        }

        if (user.value?.id === userId) {
          profile.value = data
          profileCacheId = userId
        }
        return data
      } catch (err) {
        console.error('Error fetching profile:', err)
        if (profileCacheId !== userId) {
          profile.value = null
        }
        return null
      } finally {
        if (profileInFlight === request) {
          profileInFlight = null
          profileInFlightId = null
        }
      }
    })()
    profileInFlight = request

    return request
  }

  const signIn = async (email, password) => {
    try {
      loading.value = true
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password
        }),
        LOAD_TIMEOUT_MS
      )
      if (error) throw error
      user.value = data.user
      sessionInitialized.value = true
      // Do not block navigation on profile load
      if (data.user) {
        fetchProfile(data.user.id).catch((profileError) => {
          console.warn('Profile fetch after sign-in failed:', profileError)
        })
      }
      return { data, error: null }
    } catch (error) {
      sessionInitialized.value = true
      if (error?.name === 'LoadTimeoutError') {
        return { data: null, error: new Error(SIGN_IN_TIMEOUT_MESSAGE) }
      }
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
      resetProfileCache()
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

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('getSession error:', error)
        sessionInitialized.value = true
        return { session: null, error }
      }

      const nextUser = session?.user ?? null
      if (user.value?.id && nextUser?.id && user.value.id !== nextUser.id) {
        profile.value = null
        resetProfileCache()
      }

      user.value = nextUser

      if (nextUser) {
        await fetchProfile(nextUser.id)
      } else {
        profile.value = null
        resetProfileCache()
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
      profileCacheId = user.value.id
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      loading.value = false
    }
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
    updateProfile,
    ensureSessionInitialized
  }
}
