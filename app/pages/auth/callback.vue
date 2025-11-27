<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200">
    <div class="text-center">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-4">Completing authentication...</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'guest',
  layout: false
})

const { getSession } = useAuth()
const router = useRouter()

onMounted(async () => {
  try {
    const { session } = await getSession()
    if (session) {
      await router.push('/')
    } else {
      await router.push('/auth/login')
    }
  } catch (error) {
    console.error('Auth callback error:', error)
    await router.push('/auth/login')
  }
})
</script>

