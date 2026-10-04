<template>
  <div data-admin-dock class="fixed bottom-0 left-0 right-0 z-50 md:hidden">
    <div class="dock dock-bottom bg-base-200/95 backdrop-blur-sm border-t border-base-300">
      <div v-for="tab in tabs" :key="tab.to" class="dock-item">
        <NuxtLink
          :to="tab.to"
          class="dock-button"
          :class="{ 'dock-button-active': isActive(tab) }"
          :aria-label="tab.aria"
        >
          <Icon :name="tab.icon" class="w-6 h-6" />
          <span class="dock-label">{{ tab.label }}</span>
        </NuxtLink>
      </div>
      <div class="dock-item">
        <button
          type="button"
          class="dock-button"
          :class="{ 'dock-button-active': moreActive }"
          aria-label="More"
          aria-haspopup="dialog"
          @click="openMore"
        >
          <span class="relative">
            <Icon name="mdi:dots-horizontal" class="w-6 h-6" />
            <span
              v-if="newInquiryCount > 0"
              class="badge badge-error badge-xs absolute -top-1 -right-2 min-w-4 px-1"
            >
              {{ newInquiryCount > 99 ? '99+' : newInquiryCount }}
            </span>
          </span>
          <span class="dock-label">More</span>
        </button>
      </div>
    </div>

    <dialog ref="moreSheet" class="modal modal-bottom admin-more-sheet" @close="moreOpen = false">
      <div class="modal-box rounded-b-none pb-6">
        <h3 class="font-bold text-lg mb-2">More</h3>
        <ul class="menu bg-base-100 w-full p-0">
          <li>
            <NuxtLink to="/admin/orders" class="flex items-center gap-2 text-base" @click="closeMore">
              <Icon name="mdi:receipt-text-outline" class="w-5 h-5" />
              Orders
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/admin/inquiries" class="flex items-center gap-2 text-base" @click="closeMore">
              <Icon name="mdi:inbox" class="w-5 h-5" />
              Inquiries
              <span
                v-if="newInquiryCount > 0"
                class="badge badge-error badge-sm ml-auto"
              >
                {{ newInquiryCount > 99 ? '99+' : newInquiryCount }}
              </span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/admin/subscribers" class="flex items-center gap-2 text-base" @click="closeMore">
              <Icon name="mdi:email-newsletter" class="w-5 h-5" />
              Subscribers
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/admin/customers" class="flex items-center gap-2 text-base" @click="closeMore">
              <Icon name="mdi:account-multiple-outline" class="w-5 h-5" />
              Customers
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/admin/users" class="flex items-center gap-2 text-base" @click="closeMore">
              <Icon name="mdi:account-group" class="w-5 h-5" />
              Users
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/admin/tanks" class="flex items-center gap-2 text-base" @click="closeMore">
              <Icon name="mdi:water" class="w-5 h-5" />
              Tanks
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/" class="flex items-center gap-2 text-base" @click="closeMore">
              <Icon name="mdi:arrow-left" class="w-5 h-5" />
              Back to app
            </NuxtLink>
          </li>
        </ul>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
const route = useRoute()
const { newInquiryCount } = useInquiries()
const moreSheet = ref(null)
const moreOpen = ref(false)

const tabs = [
  { to: '/admin', label: 'Dashboard', aria: 'Dashboard', icon: 'mdi:view-dashboard', exact: true },
  { to: '/admin/prices', label: 'Prices', aria: 'Prices', icon: 'mdi:currency-usd' },
  { to: '/admin/pairs-shop', label: 'Shop', aria: 'Bonded Pairs (Shop)', icon: 'mdi:storefront' },
  { to: '/admin/pairs', label: 'Mated', aria: 'Mated Pairs', icon: 'mdi:fish' }
]

const isActive = (tab) => {
  if (tab.exact) return route.path === tab.to
  if (tab.to === '/admin/pairs') {
    return route.path === '/admin/pairs' || route.path.startsWith('/admin/pairs/')
  }
  return route.path === tab.to || route.path.startsWith(`${tab.to}/`)
}

const moreActive = computed(() =>
  moreOpen.value ||
  route.path.startsWith('/admin/orders') ||
  route.path.startsWith('/admin/inquiries') ||
  route.path.startsWith('/admin/subscribers') ||
  route.path.startsWith('/admin/customers') ||
  route.path.startsWith('/admin/users') ||
  route.path.startsWith('/admin/tanks')
)

const openMore = () => {
  moreOpen.value = true
  moreSheet.value?.showModal()
}

const closeMore = () => {
  moreSheet.value?.close()
  moreOpen.value = false
}
</script>

<style scoped>
.dock {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0.5rem 0.25rem;
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
  gap: 0.125rem;
}

.dock-item {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
}

.dock-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 0.65rem 0.1rem;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
  color: color-mix(in srgb, var(--color-base-content) 70%, transparent);
  text-decoration: none;
  background: transparent;
  border: 0;
  min-width: 0;
  cursor: pointer;
}

.dock-button:hover {
  background-color: var(--color-base-200);
  color: var(--color-base-content);
  transform: translateY(-2px);
}

.dock-button-active {
  background-color: var(--color-primary);
  color: var(--color-primary-content);
}

.dock-label {
  font-size: 0.7rem;
  margin-top: 0.25rem;
  text-align: center;
  line-height: 1;
  white-space: nowrap;
}

.admin-more-sheet {
  z-index: 60;
}
</style>
