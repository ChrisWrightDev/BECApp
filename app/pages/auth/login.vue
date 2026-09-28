<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200">
    <div class="card w-full max-w-md bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title justify-center text-2xl mb-4">BEC Aquaculture</h2>
        <p class="text-center text-base-content/70 mb-6">Sign in to your account</p>

        <div v-if="error" class="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ error }}</span>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
              v-model="email"
              type="email"
              placeholder="email@example.com"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Password</span>
            </label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Password"
                class="input input-bordered w-full pr-10"
                required
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
                tabindex="-1"
              >
                <Icon 
                  :name="showPassword ? 'mdi:eye-off' : 'mdi:eye'" 
                  class="w-5 h-5"
                />
              </button>
            </div>
          </div>

          <div class="form-control mt-6">
            <button
              type="submit"
              class="btn btn-primary w-full"
              :class="{ 'loading': loading }"
              :disabled="loading"
            >
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'guest',
  layout: false
})

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

const { signIn } = useAuth()
const { recordLogin } = useSessions()
// PHASE 2: Task generation disabled - ops agent now writes checklists to checklist_days/checklist_items
// const { generateTasksByCategory, generateRegularTasks } = useTasks()
const router = useRouter()

const handleLogin = async () => {
  error.value = ''
  loading.value = true

  try {
    const { data, error: authError } = await signIn(email.value, password.value)
    
    if (authError) {
      error.value = authError.message || 'Invalid email or password'
      loading.value = false
      return
    }

    if (data) {
      // Record login time for payroll
      await recordLogin()
      
      // PHASE 2: Task generation disabled - ops agent now writes daily checklists
      // Workers simply log in and view the published checklist at /checklist
      // The old task generation logic (generateTasksByCategory, generateRegularTasks)
      // has been removed; tasks table remains readable but frozen.
      
      // Navigate to chat (Phase 1 default landing page)
      await router.push('/chat')
    }
  } catch (err) {
    error.value = err.message || 'An error occurred during login'
  } finally {
    loading.value = false
  }
}
</script>

