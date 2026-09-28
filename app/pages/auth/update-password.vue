<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
    <div class="card w-full max-w-md bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Logo/Branding -->
        <div class="text-center mb-6">
          <h1 class="text-3xl font-bold text-primary mb-2">BEC Aquaculture</h1>
          <p class="text-base-content/70">Update your password</p>
        </div>

        <!-- Link Expired Alert -->
        <div v-if="linkExpired" class="space-y-4">
          <div class="alert alert-error">
            <Icon name="mdi:alert-circle" class="w-6 h-6" />
            <div class="flex flex-col gap-1">
              <span class="font-medium">This reset link has expired</span>
              <span class="text-sm">Please request a new password reset link.</span>
            </div>
          </div>
          <div class="form-control">
            <NuxtLink to="/auth/reset-password" class="btn btn-primary w-full">
              Request New Reset Link
            </NuxtLink>
          </div>
        </div>

        <!-- Error Alert -->
        <div v-else-if="error" class="alert alert-error mb-4">
          <Icon name="mdi:alert-circle" class="w-6 h-6" />
          <span>{{ error }}</span>
        </div>

        <!-- Success Message -->
        <div v-else-if="updateSuccess" class="alert alert-success mb-4">
          <Icon name="mdi:check-circle" class="w-6 h-6" />
          <div class="flex flex-col gap-2">
            <span class="font-medium">Password updated successfully!</span>
            <span class="text-sm">Redirecting to your dashboard...</span>
          </div>
        </div>

        <!-- Update Form -->
        <form v-else-if="!linkExpired && !updateSuccess" @submit.prevent="handlePasswordUpdate" class="space-y-4">
          <!-- New Password Field -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">New Password</span>
            </label>
            <div class="relative">
              <input
                v-model="newPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter new password"
                autocomplete="new-password"
                class="input input-bordered w-full pr-12"
                :disabled="loading"
                required
                minlength="6"
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
            <label class="label">
              <span class="label-text-alt">Minimum 6 characters</span>
            </label>
          </div>

          <!-- Confirm Password Field -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Confirm Password</span>
            </label>
            <div class="relative">
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirm new password"
                autocomplete="new-password"
                class="input input-bordered w-full pr-12"
                :disabled="loading"
                required
                minlength="6"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
                :disabled="loading"
                tabindex="-1"
                aria-label="Toggle password visibility"
              >
                <Icon 
                  :name="showConfirmPassword ? 'mdi:eye-off' : 'mdi:eye'" 
                  class="w-5 h-5"
                />
              </button>
            </div>
          </div>

          <!-- Update Button -->
          <div class="form-control">
            <button
              type="submit"
              class="btn btn-primary w-full"
              :disabled="loading"
            >
              <span v-if="loading" class="loading loading-spinner"></span>
              {{ loading ? 'Updating...' : 'Update Password' }}
            </button>
          </div>
        </form>

      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: false
})

const supabase = useSupabaseClient()
const router = useRouter()

// Form state
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const error = ref('')
const updateSuccess = ref(false)
const linkExpired = ref(false)

// Check if there's a valid recovery session on mount
onMounted(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    // If no session or session type is not recovery, the link has expired
    if (!session) {
      linkExpired.value = true
    }
  } catch (err) {
    console.error('Error checking session:', err)
    linkExpired.value = true
  }
})

const handlePasswordUpdate = async () => {
  error.value = ''
  loading.value = true

  // Validate passwords match
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    loading.value = false
    return
  }

  // Validate password length
  if (newPassword.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    loading.value = false
    return
  }

  try {
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword.value
    })
    
    if (updateError) {
      error.value = updateError.message || 'Failed to update password'
      loading.value = false
      return
    }

    // Show success message
    updateSuccess.value = true
    
    // User is already signed in after password update, redirect to /chat
    setTimeout(() => {
      router.push('/chat')
    }, 2000)
  } catch (err) {
    error.value = err.message || 'An error occurred while updating password'
  } finally {
    loading.value = false
  }
}
</script>
