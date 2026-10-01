<template>
  <div class="min-h-screen bg-base-100 flex flex-col">
    <div class="navbar bg-gradient-to-r from-red-900 to-red-700 text-white shadow-lg sticky top-0 z-50 sticky-navbar">
      <div class="navbar-start min-w-0 sm:min-w-[250px]">
        <div class="dropdown">
          <div tabindex="0" role="button" class="btn btn-ghost lg:hidden text-white" ref="mobileDropdownTrigger" aria-label="Open admin menu">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16"></path>
            </svg>
          </div>
          <ul tabindex="0" class="menu menu-md dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-64 text-base-content">
            <li><NuxtLink to="/admin" class="flex items-center gap-2" @click="closeMobileMenu"><Icon name="mdi:view-dashboard" class="w-4 h-4" />Dashboard</NuxtLink></li>
            <li><NuxtLink to="/admin/users" class="flex items-center gap-2" @click="closeMobileMenu"><Icon name="mdi:account-group" class="w-4 h-4" />Users</NuxtLink></li>
            <li><NuxtLink to="/admin/tanks" class="flex items-center gap-2" @click="closeMobileMenu"><Icon name="mdi:water" class="w-4 h-4" />Tanks</NuxtLink></li>
            <li><NuxtLink to="/admin/prices" class="flex items-center gap-2" @click="closeMobileMenu"><Icon name="mdi:currency-usd" class="w-4 h-4" />Prices</NuxtLink></li>
          </ul>
        </div>
        <NuxtLink to="/admin" class="btn btn-ghost text-xl text-white">
          <Icon name="mdi:cog" class="w-6 h-6 mr-2 text-red-300" />
          Admin Dashboard
        </NuxtLink>
      </div>

      <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal px-0 space-x-0 menu-md">
          <li>
            <NuxtLink to="/admin/users" class="btn btn-ghost btn-sm flex items-center gap-1 px-2 text-white hover:bg-red-800">
              <Icon name="mdi:account-group" class="w-4 h-4" />Users
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/admin/tanks" class="btn btn-ghost btn-sm flex items-center gap-1 px-2 text-white hover:bg-red-800">
              <Icon name="mdi:water" class="w-4 h-4" />Tanks
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/admin/prices" class="btn btn-ghost btn-sm flex items-center gap-1 px-2 text-white hover:bg-red-800">
              <Icon name="mdi:currency-usd" class="w-4 h-4" />Prices
            </NuxtLink>
          </li>
        </ul>
      </div>

      <div class="navbar-end">
        <label class="swap swap-rotate mr-2">
          <input
            type="checkbox"
            :checked="isDark"
            class="theme-controller"
            @change="toggleTheme"
          />
          <Icon :name="isDark ? 'mdi:white-balance-sunny' : 'mdi:moon-waning-crescent'" class="w-5 h-5" />
        </label>
        <NuxtLink to="/" class="btn btn-outline btn-sm ml-2 text-white border-white hover:bg-white hover:text-red-900">
          <Icon name="mdi:arrow-left" class="w-4 h-4 mr-1" />
          Main Site
        </NuxtLink>
      </div>
    </div>

    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>

    <AppDock />
  </div>
</template>

<script setup>
const { isDark, toggleTheme } = useTheme()
const { fetchUnreadCount } = useUnreadCount()
const mobileDropdownTrigger = ref(null)

const closeMobileMenu = () => {
  mobileDropdownTrigger.value?.blur()
  document.querySelectorAll('.dropdown [tabindex="0"]').forEach((el) => el.blur())
}

onMounted(() => {
  fetchUnreadCount()
})
</script>

<style scoped>
.navbar {
  min-height: 4rem;
}

.btn-ghost:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
