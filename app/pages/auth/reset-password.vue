<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
    <div class="card w-full max-w-md bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Logo/Branding -->
        <div class="text-center mb-6">
          <h1 class="text-3xl font-bold text-primary mb-2">Blue Eyed Clowns</h1>
          <p class="text-base-content/70">Reset your password</p>
        </div>

        <!-- Info Message -->
        <div v-if="!resetSent" class="alert mb-4">
          <Icon name="mdi:information" class="w-6 h-6" />
          <span class="text-sm">Enter your email and we'll send you a password reset link.</span>
        </div>

        <!-- Success Message -->
        <div v-if="resetSent" class="alert alert-success mb-4">
          <Icon name="mdi:check-circle" class="w-6 h-6" />
          <div class="flex flex-col gap-2">
            <span class="font-medium">Password reset email sent!</span>
            <span class="text-sm">Check your inbox for the reset link. It may take a few minutes to arrive.</span>
          </div>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="alert alert-error mb-4">
          <Icon name="mdi:alert-circle" class="w-6 h-6" />
          <span>{{ error }}</span>
        </div>

        <!-- Reset Form -->
        <form v-if="!resetSent" @submit.prevent="handleResetRequest" class="space-y-4">
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

          <!-- Submit Button -->
          <div class="form-control">
            <button
              type="submit"
              class="btn btn-primary w-full"
              :disabled="loading"
            >
              <span v-if="loading" class="loading loading-spinner"></span>
              {{ loading ? 'Sending...' : 'Send Reset Link' }}
            </button>
          </div>

          <!-- Back to Login Link -->
          <div class="text-center">
            <NuxtLink 
              to="/auth/login" 
              class="link link-primary text-sm"
              :class="{ 'pointer-events-none opacity-50': loading }"
            >
              Back to login
            </NuxtLink>
          </div>
        </form>

        <!-- After Reset Sent -->
        <div v-else class="space-y-4">
          <div class="form-control">
            <NuxtLink to="/auth/login" class="btn btn-primary w-full">
              Return to Login
            </NuxtLink>
          </div>
          <button
            @click="resetForm"
            class="btn btn-ghost btn-sm w-full"
          >
            Send to a different email
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'guest',
  layout: false
})

const supabase = useSupabaseClient()
const config = useRuntimeConfig()

// Form state
const email = ref('')
const loading = ref(false)
const error = ref('')
const resetSent = ref(false)

const handleResetRequest = async () => {
  error.value = ''
  loading.value = true

  try {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.value,
      {
        redirectTo: `${window.location.origin}/auth/update-password`
      }
    )
    
    if (resetError) {
      error.value = resetError.message || 'Failed to send reset email'
      loading.value = false
      return
    }

    // Show success message
    resetSent.value = true
  } catch (err) {
    error.value = err.message || 'An error occurred while sending reset email'
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  resetSent.value = false
  email.value = ''
  error.value = ''
}
</script>
