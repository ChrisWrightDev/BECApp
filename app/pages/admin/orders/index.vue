<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-start justify-between gap-3 mb-6">
      <div class="min-w-0">
        <h1 class="text-4xl font-bold mb-2">Orders</h1>
        <p class="text-base-content/70">Shop checkouts, current and past</p>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-circle shrink-0"
        aria-label="Refresh"
        :disabled="loading"
        @click="loadOrders"
      >
        <Icon name="mdi:refresh" class="w-5 h-5" :class="{ 'animate-spin': loading && orders.length }" />
      </button>
    </div>

    <PageLoadState
      :loading="loading && orders.length === 0"
      :error="orders.length ? null : error"
      :empty="false"
      @retry="retry"
    >
      <div v-if="error && orders.length" class="alert alert-error mb-4">
        <Icon name="mdi:alert-circle" class="w-5 h-5 shrink-0" />
        <span>{{ error }}</span>
        <button type="button" class="btn btn-sm" @click="retry">Retry</button>
      </div>
      <label class="input input-bordered flex items-center gap-2 w-full mb-4 ios-field">
        <Icon name="mdi:magnify" class="w-5 h-5 text-base-content/50 shrink-0" />
        <input
          v-model="search"
          type="search"
          inputmode="search"
          enterkeyhint="search"
          autocomplete="off"
          placeholder="Name, email, or order ID"
          class="grow min-w-0 ios-field"
          aria-label="Search orders"
        >
        <button
          v-if="search"
          type="button"
          class="btn btn-ghost btn-xs btn-circle"
          aria-label="Clear search"
          @click="search = ''"
        >
          <Icon name="mdi:close" class="w-4 h-4" />
        </button>
      </label>

      <div
        class="flex gap-2 overflow-x-auto chip-row pb-1 mb-4"
        role="group"
        aria-label="Filter orders"
      >
        <button
          v-for="chip in ORDER_FILTERS"
          :key="chip.id"
          type="button"
          class="btn btn-sm min-h-11 h-11 rounded-full px-4 shrink-0"
          :class="filter === chip.id ? 'btn-primary' : 'btn-ghost bg-base-200'"
          :aria-pressed="filter === chip.id"
          @click="filter = chip.id"
        >
          {{ chip.label }}
        </button>
      </div>

      <p class="sr-only" aria-live="polite">{{ visibleOrders.length }} orders</p>

      <PageLoadState
        :loading="false"
        :empty="visibleOrders.length === 0"
        :empty-icon="emptyCopy.icon"
        :empty-title="emptyCopy.title"
        :empty-description="emptyCopy.description"
      >
        <div class="space-y-3">
          <NuxtLink
            v-for="order in visibleOrders"
            :key="order.id"
            :to="`/admin/orders/${order.id}`"
            class="card bg-base-100 shadow-xl"
            :class="order.status === 'pending' ? 'opacity-60' : ''"
          >
            <div class="card-body p-4">
              <div class="flex items-start gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <span class="font-mono font-semibold tracking-wide">{{ orderNumber(order.id) }}</span>
                    <span class="badge badge-sm shrink-0" :class="orderStatusBadgeClass(order.status)">
                      {{ orderStatusLabel(order.status) }}
                    </span>
                  </div>
                  <p class="font-medium mt-1 break-words">{{ orderCustomerLabel(order) }}</p>
                  <p class="text-sm text-base-content/70 mt-1">
                    {{ formatOrderDate(order.created_at) }}
                    · {{ orderItemCountLabel(orderItemCount(order)) }}
                    · {{ formatOrderMoney(order.total_cents) }}
                  </p>
                  <p v-if="order.status === 'pending'" class="text-xs text-base-content/60 mt-2">
                    Checkout started, not paid yet
                  </p>
                </div>
                <Icon name="mdi:chevron-right" class="w-5 h-5 text-base-content/40 mt-0.5 shrink-0" />
              </div>
            </div>
          </NuxtLink>
        </div>
      </PageLoadState>
    </PageLoadState>
  </div>
</template>

<script setup>
import {
  ORDER_FILTERS,
  emptyOrdersCopy,
  formatOrderDate,
  formatOrderMoney,
  matchesOrderFilter,
  matchesOrderSearch,
  orderCustomerLabel,
  orderItemCount,
  orderItemCountLabel,
  orderNumber,
  orderStatusBadgeClass,
  orderStatusLabel
} from '~/utils/orders'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const { fetchOrders } = useOrders()
const orders = ref([])
const search = ref('')
const filter = ref('action')

const { loading, error, load: loadOrders, retry } = usePageLoad(async () => {
  orders.value = await fetchOrders()
})

const visibleOrders = computed(() =>
  orders.value.filter((order) =>
    matchesOrderFilter(order, filter.value) && matchesOrderSearch(order, search.value)
  )
)

const emptyCopy = computed(() => emptyOrdersCopy(filter.value, search.value))

onMounted(async () => {
  await loadOrders()
})
</script>

<style scoped>
.chip-row {
  scrollbar-width: none;
}

.chip-row::-webkit-scrollbar {
  display: none;
}

.ios-field,
.ios-field:focus,
.ios-field:hover,
.ios-field:disabled,
input.ios-field {
  font-size: 16px !important;
}
</style>
