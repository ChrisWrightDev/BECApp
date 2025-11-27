<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Notifications />
  </div>
</template>

<script setup>
// Initialize auth state
const { getSession } = useAuth()

onMounted(async () => {
  await getSession()
})
</script>
