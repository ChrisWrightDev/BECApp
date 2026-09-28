<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
    <div class="card w-full max-w-md bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Logo/Branding -->
        <div class="text-center mb-6">
          <h1 class="text-3xl font-bold text-primary mb-2">BEC Aquaculture</h1>
          <p class="text-base-content/70">Sign in to your account</p>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="alert alert-error mb-4">
          <Icon name="mdi:alert-circle" class="w-6 h-6" />
          <span>{{ error }}</span>
        </div>

        <!-- Success Message (for password reset) -->
        <div v-if="successMessage" class="alert alert-success mb-4">
          <Icon name="mdi:check-circle" class="w-6 h-6" />
          <span>{{ successMessage }}</span>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Email Field -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
              v-model="email"
              type="email"
              placeholder="your.email@example.com"
              autocomplete="email"
              class="input input-bordered w-full"
              :disabled="loading"
              required
            />
          </div>

          <!-- Password Field -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Password</span>
            </label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                autocomplete="current-password"
                class="input input-bordered w-full pr-12"
                :disabled="loading"
                required
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
                :disabled="loading"
                tabindex="-1"
                aria-label="Toggle password visibility"
              >
                <Icon 
                  :name="showPassword ? 'mdi:eye-off' : 'mdi:eye'" 
                  class="w-5 h-5"
                />
              </button>
            </div>
          </div>

          <!-- Keep me signed in checkbox -->
          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input 
                v-model="keepSignedIn" 
                type="checkbox" 
                class="checkbox checkbox-primary"
                :disabled="loading"
              />
              <span class="label-text">Keep me signed in</span>
            </label>
          </div>

          <!-- Sign In Button -->
          <div class="form-control">
            <button
              type="submit"
              class="btn btn-primary w-full"
              :disabled="loading"
            >
              <span v-if="loading" class="loading loading-spinner"></span>
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
          </div>

          <!-- Forgot Password Link -->
          <div class="text-center">
            <NuxtLink 
              to="/auth/reset-password" 
              class="link link-primary text-sm"
              :class="{ 'pointer-events-none opacity-50': loading }"
            >
              Forgot password?
            </NuxtLink>
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

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

// Form state
const email = ref('')
const password = ref('')
const keepSignedIn = ref(true)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const successMessage = ref('')

// Check for success message from password reset
onMounted(() => {
  if (route.query.message === 'reset-sent') {
    successMessage.value = 'Password reset email sent! Check your inbox.'
  }
})

const handleLogin = async () => {
  error.value = ''
  successMessage.value = ''
  loading.value = true

  try {
    // Update storage option before sign in based on checkbox
    const storageKey = keepSignedIn.value ? 'local' : 'session'
    
    // Sign in with Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    
    if (authError) {
      error.value = authError.message || 'Invalid email or password'
      loading.value = false
      return
    }

    if (data?.user) {
      // Store the storage preference
      if (keepSignedIn.value) {
        localStorage.setItem('supabase.auth.storage', 'local')
      } else {
        localStorage.setItem('supabase.auth.storage', 'session')
      }

      // Record login time for payroll
      try {
        const { recordLogin } = useSessions()
        await recordLogin()
      } catch (sessionError) {
        console.warn('Failed to record login session:', sessionError)
      }
      
      // Navigate to redirect URL or default to /chat
      const redirectTo = route.query.redirect?.toString() || '/chat'
      await router.push(redirectTo)
    }
  } catch (err) {
    error.value = err.message || 'An error occurred during login'
  } finally {
    loading.value = false
  }
}
</script>
