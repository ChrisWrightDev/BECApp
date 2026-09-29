<template>
  <div class="navbar bg-base-200 shadow-lg sticky top-0 z-50 sticky-navbar">
    <div class="navbar-start min-w-0 sm:min-w-[250px]">
      <div class="dropdown" ref="mobileDropdown">
        <div tabindex="0" role="button" class="btn btn-ghost lg:hidden" ref="mobileDropdownTrigger" aria-label="Open menu">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16"></path>
          </svg>
        </div>
        <ul tabindex="0" class="menu menu-md dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
          <li v-for="item in navItems" :key="item.to">
            <NuxtLink :to="item.to" class="flex items-center gap-1" @click="closeMobileMenu">
              <Icon :name="item.icon" class="w-4 h-4" />
              {{ item.label }}
              <div
                v-if="item.badge && unreadCount > 0"
                class="badge badge-error badge-xs unread-nav-badge"
              >
                {{ unreadCount > 99 ? '99+' : unreadCount }}
              </div>
            </NuxtLink>
          </li>
          <li v-if="showAdminLink">
            <NuxtLink
              to="/admin"
              class="flex items-center gap-2 text-red-600"
              @click="closeMobileMenu"
            >
              <Icon name="mdi:cog" class="w-4 h-4" />
              Admin
            </NuxtLink>
          </li>
        </ul>
      </div>
      <NuxtLink to="/" class="btn btn-ghost text-xl px-2 sm:px-4">
        <img src="/images/logo.png" alt="Blue Eyed Clowns" class="h-8 w-auto mr-2" />
        <span class="hidden sm:inline">Blue Eyed Clowns</span>
        <span class="sm:hidden">BEC</span>
      </NuxtLink>
    </div>

    <div class="navbar-center hidden lg:flex">
      <ul class="menu menu-horizontal px-0 space-x-0 menu-md">
        <li v-for="item in navItems" :key="item.to">
          <NuxtLink :to="item.to" class="btn btn-ghost btn-sm flex items-center gap-0.5 px-1">
            <Icon :name="item.icon" class="w-4 h-4" />
            {{ item.label }}
            <div
              v-if="item.badge && unreadCount > 0"
              class="badge badge-error badge-xs unread-nav-badge"
            >
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </div>
          </NuxtLink>
        </li>
        <li v-if="showAdminLink">
          <NuxtLink
            to="/admin"
            class="btn btn-sm text-white border-0 bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600"
          >
            <Icon name="mdi:cog" class="w-4 h-4" />
            Admin
          </NuxtLink>
        </li>
      </ul>
    </div>

    <div class="navbar-end">
      <ClientOnly>
        <div v-if="user" class="dropdown dropdown-end" ref="profileDropdown">
        <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar" ref="profileDropdownTrigger" aria-label="Account menu">
          <div class="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center leading-10">
            {{ userInitials }}
          </div>
        </div>
        <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
          <li>
            <div class="flex flex-col items-start gap-0 cursor-default">
              <span class="flex items-center gap-2">
                <Icon name="mdi:account-circle" class="w-4 h-4" />
                Profile
              </span>
              <span class="text-xs text-base-content/50 font-normal pl-6">{{ userName }}</span>
            </div>
          </li>
          <li>
            <label class="flex items-center gap-2 cursor-pointer">
              <Icon :name="isDark ? 'mdi:white-balance-sunny' : 'mdi:moon-waning-crescent'" class="w-4 h-4" />
              {{ isDark ? 'Light Mode' : 'Dark Mode' }}
              <input
                type="checkbox"
                :checked="isDark"
                class="toggle toggle-sm ml-auto"
                @change="toggleTheme"
              />
            </label>
          </li>
          <li>
            <button class="text-error flex items-center gap-2" @click="handleLogout">
              <Icon name="mdi:logout" class="w-4 h-4" />
              Logout
            </button>
          </li>
        </ul>
      </div>
      <div v-else>
        <NuxtLink to="/auth/login" class="btn btn-primary flex items-center gap-2">
          <Icon name="mdi:login" class="w-4 h-4" />
          Login
        </NuxtLink>
      </div>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup>
const { isDark, toggleTheme } = useTheme()
const { user, profile, signOut, isAdmin } = useAuth()
const { unreadCount } = useUnreadCount()

const navItems = [
  { to: '/', label: 'Home', icon: 'mdi:home' },
  { to: '/checklist', label: 'Checklists', icon: 'mdi:checkbox-marked-outline' },
  { to: '/chat', label: 'Chat', icon: 'mdi:message-outline', badge: true },
  { to: '/hatches', label: 'Hatches', icon: 'mdi:egg-outline' },
  { to: '/pairs', label: 'Pairs', icon: 'mdi:fish' }
]

const isAdminUser = computed(() => {
  try {
    return isAdmin()
  } catch {
    return false
  }
})

const showAdminLink = ref(false)

onMounted(() => {
  showAdminLink.value = isAdminUser.value
})

watch(isAdminUser, (value) => {
  showAdminLink.value = value
})

const userInitials = computed(() => {
  if (profile.value?.firstname && profile.value?.lastname) {
    return `${profile.value.firstname.charAt(0)}${profile.value.lastname.charAt(0)}`.toUpperCase()
  }
  if (profile.value?.firstname) return profile.value.firstname.charAt(0).toUpperCase()
  if (user.value?.email) return user.value.email.split('@')[0].substring(0, 2).toUpperCase()
  return 'U'
})

const userName = computed(() => {
  if (profile.value?.firstname && profile.value?.lastname) {
    return `${profile.value.firstname} ${profile.value.lastname}`
  }
  if (profile.value?.firstname) return profile.value.firstname
  return user.value?.email || 'Account'
})

const mobileDropdownTrigger = ref(null)
const profileDropdownTrigger = ref(null)

const blurDropdown = (triggerRef) => {
  triggerRef.value?.blur()
  document.querySelectorAll('.dropdown [tabindex="0"]').forEach((el) => el.blur())
  setTimeout(() => {
    document.body.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }))
  }, 10)
  setTimeout(() => {
    const active = document.activeElement
    if (active && (active.closest('.dropdown') || active.closest('.menu'))) active.blur()
  }, 50)
}

const closeMobileMenu = () => blurDropdown(mobileDropdownTrigger)
const closeProfileMenu = () => blurDropdown(profileDropdownTrigger)

const handleLogout = async () => {
  closeProfileMenu()
  await signOut()
  await navigateTo('/auth/login')
}
</script>

<style scoped>
.unread-nav-badge {
  animation: pulse 2s infinite;
  font-weight: bold;
  min-width: 0.9rem;
  height: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  line-height: 1;
  margin-left: -0.125rem;
  margin-top: -0.5rem;
  padding: 0;
  background-color: #dc2626 !important;
  color: white !important;
  border: none;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
</style>
