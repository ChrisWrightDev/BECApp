export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on server side
  if (process.server) {
    return
  }

  const supabase = useSupabaseClient()
  const { getSession, isAdmin, fetchProfile, ensureSessionInitialized } = useAuth()

  await ensureSessionInitialized()

  // Check session directly from Supabase (getSession, not getUser)
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.user) {
      return navigateTo('/auth/login')
    }

    // Update user state via getSession (it handles readonly refs internally)
    await getSession() // This will set user state and load profile

    if (!isAdmin() && session.user.id) {
      await fetchProfile(session.user.id)
    }

    if (!isAdmin()) {
      return navigateTo('/')
    }
  } catch (error) {
    console.error('Admin middleware error:', error)
    return navigateTo('/auth/login')
  }
})
