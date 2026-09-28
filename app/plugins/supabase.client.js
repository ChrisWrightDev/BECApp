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

  // Custom storage adapter that checks preference on every call
  const storageAdapter = {
    getItem: (key) => {
      const storageMode = localStorage.getItem('supabase.auth.storage')
      const storage = storageMode === 'session' ? sessionStorage : localStorage
      return storage.getItem(key)
    },
    setItem: (key, value) => {
      const storageMode = localStorage.getItem('supabase.auth.storage')
      const storage = storageMode === 'session' ? sessionStorage : localStorage
      storage.setItem(key, value)
    },
    removeItem: (key) => {
      const storageMode = localStorage.getItem('supabase.auth.storage')
      const storage = storageMode === 'session' ? sessionStorage : localStorage
      storage.removeItem(key)
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: storageAdapter
    },
    global: {
      headers: {
        'X-Client-Info': 'nuxt-app'
      }
    }
  })

  // Auto-refresh on visibility change using documented pattern
  if (process.client) {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.startAutoRefresh()
      } else {
        supabase.auth.stopAutoRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Start auto-refresh if page is currently visible
    if (document.visibilityState === 'visible') {
      supabase.auth.startAutoRefresh()
    }
  }

    // Provide Supabase client to the app
    return {
      provide: {
        supabase
      }
    }
  }
})

