export default defineNuxtPlugin({
  name: 'z-auth-init',
  // Run after supabase.client.js (plugins run alphabetically, 'z-' ensures this runs last)
  async setup(nuxtApp) {
    // Only run on client side
    if (process.client) {
      // Wait for Supabase to be available
      // Check multiple ways to access the client
      let supabase = null
      let attempts = 0
      const maxAttempts = 50
      
      // Wait for Supabase plugin to finish initializing
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Try to get Supabase client - plugins provide it to nuxtApp.$supabase
      try {
        supabase = nuxtApp.$supabase
        
        // If not available directly, try via composable
        if ((!supabase || !supabase.auth) && typeof useSupabaseClient === 'function') {
          try {
            supabase = useSupabaseClient()
          } catch (e) {
            // Composable not ready - that's OK
          }
        }
      } catch (e) {
        // Ignore errors - will continue without Supabase for now
      }
      
      // If still not available after initial wait, try once more after a delay
      if ((!supabase || !supabase.auth)) {
        await new Promise(resolve => setTimeout(resolve, 200))
        try {
          supabase = nuxtApp.$supabase
          if ((!supabase || !supabase.auth) && typeof useSupabaseClient === 'function') {
            supabase = useSupabaseClient()
          }
        } catch (e) {
          // Still not available - that's OK
        }
      }
      
      // Check if we got a client (could be real or mock)
      if (!supabase || !supabase.auth) {
        // This is OK - the middleware will handle session loading when routes are accessed
        // Supabase might not be available during plugin init, which is fine
        // Just mark as initialized to prevent loops
        const sessionInitializedState = useState('sessionInitialized', () => false)
        sessionInitializedState.value = true
        
        // Only log if env vars are actually missing (not just timing issue)
        const config = useRuntimeConfig()
        const hasUrl = config.public.supabaseUrl
        const hasKey = config.public.supabaseAnonKey
        
        if ((!hasUrl || !hasKey) && process.dev) {
          console.warn('⚠️ Supabase environment variables are missing.')
          console.warn('Create a .env file with SUPABASE_URL and SUPABASE_ANON_KEY')
        }
        // If env vars exist, this is just a timing issue - completely normal and harmless
        // The middleware will handle session loading when routes are accessed
        return
      }
      
      // Note: Even if it's a mock client, we can still proceed - it will just return errors
      // which is better than breaking the app completely
      
      // Wait a few ticks to ensure everything is ready
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      try {
        // Verify supabase is still available and has auth
        if (!supabase || !supabase.auth) {
          console.error('Supabase client lost after initialization')
          const sessionInitializedState = useState('sessionInitialized', () => false)
          sessionInitializedState.value = true
          return
        }
        
        // Initialize session directly using Supabase (we know it's available here)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!error && session) {
          // Update auth state using useState directly to avoid readonly issues
          const userState = useState('user', () => null)
          const profileState = useState('userProfile', () => null)
          const sessionInitializedState = useState('sessionInitialized', () => false)
          
          userState.value = session.user
          sessionInitializedState.value = true
          
          // Fetch profile if user exists
          if (session.user) {
            try {
              const { fetchProfile } = useAuth()
              await fetchProfile(session.user.id)
            } catch (e) {
              console.warn('Failed to fetch profile:', e)
            }
          }
        } else {
          // No session, mark as initialized anyway
          const sessionInitializedState = useState('sessionInitialized', () => false)
          sessionInitializedState.value = true
        }
      } catch (error) {
        console.error('Auth init plugin error:', error)
        // Mark as initialized even on error to prevent infinite loops
        const sessionInitializedState = useState('sessionInitialized', () => false)
        sessionInitializedState.value = true
      }
    }
  },
  // Ensure this plugin runs before middleware
  enforce: 'pre'
})

