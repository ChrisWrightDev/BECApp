export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on server side
  if (process.server) {
    return
  }

  const supabase = useSupabaseClient()
  const { user, getSession, isAdmin } = useAuth()

  // First check if user is already set
  if (user.value) {
    if (!isAdmin()) {
      return navigateTo('/')
    }
    return
  }

  // Check session directly from Supabase
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.user) {
      return navigateTo('/auth/login')
    }

    // Update user state via getSession (it handles readonly refs internally)
    await getSession() // This will set user state and load profile
    
    if (!isAdmin()) {
      return navigateTo('/')
    }
  } catch (error) {
    console.error('Admin middleware error:', error)
    return navigateTo('/auth/login')
  }
})

