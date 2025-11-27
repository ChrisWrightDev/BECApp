<template>
  <div class="min-h-screen bg-base-200">
    <nav class="navbar bg-base-100 shadow-lg">
      <div class="navbar-start">
        <!-- Mobile menu button -->
        <div class="dropdown lg:hidden">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
            <Icon name="mdi:menu" class="w-6 h-6" />
          </div>
          <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li><NuxtLink to="/admin" @click="closeMobileMenu">Dashboard</NuxtLink></li>
            <li><NuxtLink to="/admin/templates" @click="closeMobileMenu">Templates</NuxtLink></li>
            <li><NuxtLink to="/admin/users" @click="closeMobileMenu">Users</NuxtLink></li>
            <li><NuxtLink to="/admin/analytics" @click="closeMobileMenu">Analytics</NuxtLink></li>
          </ul>
        </div>
        <NuxtLink to="/" class="btn btn-ghost text-lg sm:text-xl px-2 sm:px-4" active-class="" exact-active-class="">
          <span class="hidden sm:inline">BEC Admin</span>
          <span class="sm:hidden">Admin</span>
        </NuxtLink>
      </div>
      <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal px-1">
          <li><NuxtLink to="/admin">Dashboard</NuxtLink></li>
          <li><NuxtLink to="/admin/templates">Templates</NuxtLink></li>
          <li><NuxtLink to="/admin/users">Users</NuxtLink></li>
          <li><NuxtLink to="/admin/analytics">Analytics</NuxtLink></li>
        </ul>
      </div>
      <div class="navbar-end">
        <NuxtLink to="/" class="btn btn-ghost btn-sm sm:btn-md hidden sm:inline-flex">Back to App</NuxtLink>
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
            <ClientOnly>
              <div class="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                {{ userInitials }}
              </div>
              <template #fallback>
                <div class="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                  U
                </div>
              </template>
            </ClientOnly>
          </div>
          <ul tabindex="0" class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
            <li><a @click="handleSignOut">Logout</a></li>
          </ul>
        </div>
      </div>
    </nav>

    <main class="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <slot />
    </main>
  </div>
</template>

<script setup>
const { user, profile, signOut } = useAuth()

const userInitials = computed(() => {
  // During SSR, always return placeholder
  if (process.server) {
    return 'U'
  }
  
  if (profile.value?.firstname && profile.value?.lastname) {
    return (profile.value.firstname.charAt(0) + profile.value.lastname.charAt(0)).toUpperCase()
  }
  if (profile.value?.firstname) {
    return profile.value.firstname.charAt(0).toUpperCase()
  }
  if (user.value?.email) {
    return user.value.email.charAt(0).toUpperCase()
  }
  return 'U'
})

const handleSignOut = async () => {
  await signOut()
  await navigateTo('/auth/login')
}

const closeMobileMenu = () => {
  // Close mobile menu by blurring the active element
  if (document.activeElement) {
    document.activeElement.blur()
  }
}
</script>

