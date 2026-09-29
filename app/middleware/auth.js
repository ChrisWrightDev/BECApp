export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on server side - middleware should only run on client
  if (process.server) {
    return
  }

  // Skip if already going to auth pages
  if (to.path === '/auth/login' || to.path === '/auth/callback' || to.path === '/auth/reset-password' || to.path === '/auth/update-password') {
    return
  }

  const supabase = useSupabaseClient()
  const { user, getSession, sessionInitialized, ensureSessionInitialized } = useAuth()

  await ensureSessionInitialized()

  // Fast path: if user is already authenticated and session is initialized
  if (user.value && sessionInitialized.value) {
    return
  }

  // Wait for session restoration on cold start
  try {
    // Get the current session from Supabase (this will use refresh token if needed)
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Middleware auth check error:', error)
      return navigateTo('/auth/login')
    }

    // If we have a valid session, update the auth state
    if (session?.user) {
      // Update auth composable state
      await getSession()
      
      // Verify user was set after session restoration
      if (user.value) {
        return
      }
    }

    // No valid session found, redirect to login with return path
    const redirectPath = to.fullPath !== '/' ? `?redirect=${encodeURIComponent(to.fullPath)}` : ''
    return navigateTo(`/auth/login${redirectPath}`)
  } catch (error) {
    console.error('Middleware auth exception:', error)
    return navigateTo('/auth/login')
  }
})
