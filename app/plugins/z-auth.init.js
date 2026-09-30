import { ensureSessionInitialized } from '~/composables/useAuth'

export default defineNuxtPlugin({
  name: 'z-auth-init',
  // Runs after a-supabase-client (enforce: 'pre') so $supabase and the
  // shared init promise already exist. No setTimeout/nextTick sleeps.
  async setup() {
    if (!process.client) return
    await ensureSessionInitialized()
  }
})
