export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on server side - middleware should only run on client
  if (process.server) {
    return
  }

  // Skip if already going to login page
  if (to.path === '/auth/login' || to.path === '/auth/callback') {
    return
  }

  const supabase = useSupabaseClient()
  const { user, getSession } = useAuth()

  // First check if user is already set (fast path)
  if (user.value) {
    return
  }

  // If not, check session directly from Supabase
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Middleware auth check error:', error)
      return navigateTo('/auth/login')
    }

    // If we have a session, update user state via getSession (which handles readonly properly)
    if (session?.user) {
      // Call getSession to update state properly (it handles the readonly refs internally)
      await getSession()
      // Verify user was set after getSession
      if (user.value) {
        return
      }
    }

    // No session found, redirect to login
    if (!session) {
      return navigateTo('/auth/login')
    }
  } catch (error) {
    console.error('Middleware auth exception:', error)
    return navigateTo('/auth/login')
  }
})

