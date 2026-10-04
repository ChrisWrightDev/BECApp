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
            <li><NuxtLink to="/admin/orders" class="flex items-center gap-2" @click="closeMobileMenu"><Icon name="mdi:receipt-text-outline" class="w-4 h-4" />Orders</NuxtLink></li>
            <li>
              <NuxtLink to="/admin/inquiries" class="flex items-center gap-2" @click="closeMobileMenu">
                <Icon name="mdi:inbox" class="w-4 h-4" />
                Inquiries
                <span v-if="newInquiryCount > 0" class="badge badge-error badge-xs">{{ newInquiryCount > 99 ? '99+' : newInquiryCount }}</span>
              </NuxtLink>
            </li>
            <li><NuxtLink to="/admin/subscribers" class="flex items-center gap-2" @click="closeMobileMenu"><Icon name="mdi:email-newsletter" class="w-4 h-4" />Subscribers</NuxtLink></li>
            <li><NuxtLink to="/admin/customers" class="flex items-center gap-2" @click="closeMobileMenu"><Icon name="mdi:account-multiple-outline" class="w-4 h-4" />Customers</NuxtLink></li>
            <li><NuxtLink to="/admin/users" class="flex items-center gap-2" @click="closeMobileMenu"><Icon name="mdi:account-group" class="w-4 h-4" />Users</NuxtLink></li>
            <li><NuxtLink to="/admin/tanks" class="flex items-center gap-2" @click="closeMobileMenu"><Icon name="mdi:water" class="w-4 h-4" />Tanks</NuxtLink></li>
            <li><NuxtLink to="/admin/prices" class="flex items-center gap-2" @click="closeMobileMenu"><Icon name="mdi:currency-usd" class="w-4 h-4" />Prices</NuxtLink></li>
            <li><NuxtLink to="/admin/pairs" class="flex items-center gap-2" @click="closeMobileMenu"><Icon name="mdi:fish" class="w-4 h-4" />Mated Pairs</NuxtLink></li>
            <li><NuxtLink to="/admin/pairs-shop" class="flex items-center gap-2" @click="closeMobileMenu"><Icon name="mdi:storefront" class="w-4 h-4" />Bonded Pairs (Shop)</NuxtLink></li>
          </ul>
        </div>
        <NuxtLink to="/admin" class="btn btn-ghost text-lg sm:text-xl text-white min-w-0 px-1">
          <span class="sm:hidden">Admin</span>
          <span class="hidden sm:inline whitespace-nowrap">Admin Dashboard</span>
        </NuxtLink>
      </div>

      <div class="navbar-center hidden lg:flex min-w-0 overflow-x-auto">
        <ul class="menu menu-horizontal px-0 space-x-0 menu-md flex-nowrap">
          <li>
            <NuxtLink to="/admin/orders" class="btn btn-ghost btn-sm flex items-center gap-1 px-2 text-white hover:bg-red-800">
              <Icon name="mdi:receipt-text-outline" class="w-4 h-4" />Orders
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/admin/inquiries" class="btn btn-ghost btn-sm flex items-center gap-1 px-2 text-white hover:bg-red-800">
              <Icon name="mdi:inbox" class="w-4 h-4" />
              Inquiries
              <span v-if="newInquiryCount > 0" class="badge badge-xs bg-white text-red-900 border-0">{{ newInquiryCount > 99 ? '99+' : newInquiryCount }}</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/admin/subscribers" class="btn btn-ghost btn-sm flex items-center gap-1 px-2 text-white hover:bg-red-800">
              <Icon name="mdi:email-newsletter" class="w-4 h-4" />Subscribers
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/admin/customers" class="btn btn-ghost btn-sm flex items-center gap-1 px-2 text-white hover:bg-red-800">
              <Icon name="mdi:account-multiple-outline" class="w-4 h-4" />Customers
            </NuxtLink>
          </li>
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
          <li>
            <NuxtLink to="/admin/pairs" class="btn btn-ghost btn-sm flex items-center gap-1 px-2 text-white hover:bg-red-800">
              <Icon name="mdi:fish" class="w-4 h-4" />Mated Pairs
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/admin/pairs-shop" class="btn btn-ghost btn-sm flex items-center gap-1 px-2 text-white hover:bg-red-800">
              <Icon name="mdi:storefront" class="w-4 h-4" />Bonded Pairs (Shop)
            </NuxtLink>
          </li>
        </ul>
      </div>

      <div class="navbar-end">
        <label class="swap swap-rotate mr-1 shrink-0">
          <input
            type="checkbox"
            :checked="isDark"
            class="theme-controller"
            @change="toggleTheme"
          />
          <Icon :name="isDark ? 'mdi:white-balance-sunny' : 'mdi:moon-waning-crescent'" class="w-5 h-5" />
        </label>
        <NuxtLink to="/" class="btn btn-outline btn-xs ml-1 px-2 min-h-0 h-7 text-xs shrink-0 text-white border-white hover:bg-white hover:text-red-900">
          <Icon name="mdi:arrow-left" class="w-3 h-3" />
          Main Site
        </NuxtLink>
      </div>
    </div>

    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>

    <AdminDock />
  </div>
</template>

<script setup>
const { isDark, toggleTheme } = useTheme()
const { newInquiryCount, fetchNewInquiryCount } = useInquiries()
const mobileDropdownTrigger = ref(null)

onMounted(() => {
  fetchNewInquiryCount().catch(() => {})
})

const closeMobileMenu = () => {
  mobileDropdownTrigger.value?.blur()
  document.querySelectorAll('.dropdown [tabindex="0"]').forEach((el) => el.blur())
}

</script>

<style scoped>
.navbar {
  min-height: 4rem;
  flex-wrap: nowrap;
}

.navbar-start {
  flex: 0 0 auto;
  overflow: hidden;
}

.navbar-center {
  flex: 1 1 auto;
  min-width: 0;
  justify-content: flex-start;
  overflow-x: auto;
  scrollbar-width: none;
}

.navbar-center::-webkit-scrollbar {
  display: none;
}

.navbar-center :deep(.menu) {
  flex-wrap: nowrap;
}

.navbar-center :deep(.menu > li) {
  flex-shrink: 0;
}

.navbar-end {
  flex: 0 0 auto;
  margin-left: auto;
}

.btn-ghost:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
