export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.server) {
    return
  }

  const { user, ensureSessionInitialized } = useAuth()

  await ensureSessionInitialized()

  if (user.value) {
    return navigateTo('/')
  }
})
