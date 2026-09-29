<template>
  <header class="app-topbar">
    <div class="app-topbar-inner">
      <div class="app-topbar-start">
        <ClientOnly>
          <NuxtLink
            v-if="isAdmin()"
            to="/admin"
            class="app-admin-link"
            :class="{ 'is-active': isAdminRoute }"
          >
            Admin
          </NuxtLink>
        </ClientOnly>
      </div>

      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="btn btn-ghost btn-circle btn-sm avatar" aria-label="Account menu">
          <ClientOnly>
            <div class="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-semibold">
              {{ userInitials }}
            </div>
            <template #fallback>
              <div class="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-semibold">
                U
              </div>
            </template>
          </ClientOnly>
        </div>
        <ul tabindex="0" class="mt-3 z-[50] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-base-300">
          <li class="menu-title">
            <ClientOnly>
              <span>{{ userName }}</span>
              <template #fallback>
                <span>Account</span>
              </template>
            </ClientOnly>
          </li>
          <li>
            <a @click="handleSignOut">
              <Icon name="mdi:logout" class="w-4 h-4" />
              Sign out
            </a>
          </li>
        </ul>
      </div>
    </div>
  </header>
</template>

<script setup>
const route = useRoute()
const { user, profile, signOut, isAdmin } = useAuth()

const isAdminRoute = computed(() => route.path.startsWith('/admin'))

const userInitials = computed(() => {
  if (process.server) return 'U'
  if (profile.value?.firstname && profile.value?.lastname) {
    return (profile.value.firstname.charAt(0) + profile.value.lastname.charAt(0)).toUpperCase()
  }
  if (profile.value?.firstname) return profile.value.firstname.charAt(0).toUpperCase()
  if (user.value?.email) return user.value.email.charAt(0).toUpperCase()
  return 'U'
})

const userName = computed(() => {
  if (process.server) return 'Account'
  if (profile.value?.firstname && profile.value?.lastname) {
    return `${profile.value.firstname} ${profile.value.lastname}`
  }
  if (profile.value?.firstname) return profile.value.firstname
  return user.value?.email || 'Account'
})

const handleSignOut = async () => {
  if (document.activeElement) document.activeElement.blur()
  await signOut()
  await navigateTo('/auth/login')
}
</script>
