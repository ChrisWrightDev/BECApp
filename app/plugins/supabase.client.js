import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin({
  name: 'a-supabase-client', // 'a-' prefix ensures this runs first (alphabetically before 'z-')
  setup() {
    const config = useRuntimeConfig()
  
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseAnonKey

  // Validate environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = 'Supabase URL or Anon Key is missing. Please create a .env file with SUPABASE_URL and SUPABASE_ANON_KEY.'
    console.error(errorMsg)
    
    // Return a mock client that will throw helpful errors
    const mockClient = {
      auth: {
        signInWithPassword: () => Promise.resolve({ 
          data: null, 
          error: { message: errorMsg } 
        }),
        signUp: () => Promise.resolve({ 
          data: null, 
          error: { message: errorMsg } 
        }),
        signOut: () => Promise.resolve({ 
          error: { message: errorMsg } 
        }),
        getSession: () => Promise.resolve({ 
          data: { session: null }, 
          error: { message: errorMsg } 
        }),
        onAuthStateChange: () => ({ data: { subscription: null }, error: { message: errorMsg } })
      }
    }
    
    return {
      provide: {
        supabase: mockClient
      }
    }
  }

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch (e) {
    console.error('Invalid Supabase URL format:', supabaseUrl)
    throw new Error('Invalid SUPABASE_URL format. It must be a valid URL (e.g., https://your-project.supabase.co)')
  }

  // Get storage preference (default to localStorage for persistent sessions)
  const getStorage = () => {
    if (process.client) {
      const storagePreference = localStorage.getItem('supabase.auth.storage')
      return storagePreference === 'session' ? sessionStorage : localStorage
    }
    return undefined
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: getStorage()
    },
    global: {
      headers: {
        'X-Client-Info': 'nuxt-app'
      }
    }
  })

  // Refresh session on visibility change (when app comes back to foreground)
  if (process.client) {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            // Trigger a silent refresh to ensure token is fresh
            await supabase.auth.refreshSession()
          }
        } catch (error) {
          console.warn('Failed to refresh session on visibility change:', error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)
  }

    // Provide Supabase client to the app
    return {
      provide: {
        supabase
      }
    }
  }
})

