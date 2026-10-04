<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-start justify-between gap-3 mb-6">
      <div class="min-w-0">
        <h1 class="text-4xl font-bold mb-2">Customers</h1>
        <p class="text-base-content/70">Shop customers, orders, and notes</p>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-circle shrink-0"
        aria-label="Refresh"
        :disabled="loading"
        @click="loadCustomers"
      >
        <Icon name="mdi:refresh" class="w-5 h-5" :class="{ 'animate-spin': loading && customers.length }" />
      </button>
    </div>

    <PageLoadState
      :loading="loading && customers.length === 0"
      :error="customers.length ? null : error"
      :empty="false"
      @retry="retry"
    >
      <div v-if="error && customers.length" class="alert alert-error mb-4">
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
          placeholder="Name or email"
          class="grow min-w-0 ios-field"
          aria-label="Search customers"
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

      <p class="sr-only" aria-live="polite">{{ visibleRows.length }} customers</p>

      <PageLoadState
        :loading="false"
        :empty="visibleRows.length === 0"
        :empty-icon="emptyCopy.icon"
        :empty-title="emptyCopy.title"
        :empty-description="emptyCopy.description"
      >
        <div class="space-y-3">
          <NuxtLink
            v-for="row in visibleRows"
            :key="row.customer.id"
            :to="`/admin/customers/${row.customer.id}`"
            class="card bg-base-100 shadow-xl"
          >
            <div class="card-body p-4">
              <div class="flex items-start gap-2">
                <div class="min-w-0 flex-1">
                  <p class="font-semibold break-words">{{ customerLabel(row.customer) }}</p>
                  <p v-if="row.customer.email" class="text-sm text-base-content/70 break-all mt-1">
                    {{ row.customer.email }}
                  </p>
                  <p class="text-sm mt-1">{{ customerSpendLabel(row.stats) }}</p>
                  <p class="text-sm text-base-content/60 mt-1">
                    {{ sourceLabel(row.customer.source) }}
                    · {{ formatOrderDate(row.customer.created_at) }}
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
import { formatOrderDate } from '~/utils/orders'
import {
  customerLabel,
  customerSpendLabel,
  customerStats,
  describeCustomerError,
  emptyCustomersCopy,
  matchesCustomerSearch,
  sourceLabel
} from '~/utils/inbox'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const { fetchCustomers, fetchOrderSummaries } = useCustomers()
const customers = ref([])
const orders = ref([])
const search = ref('')

const { loading, error, load: loadCustomers, retry } = usePageLoad(async () => {
  try {
    const [customerRows, orderRows] = await Promise.all([
      fetchCustomers(),
      fetchOrderSummaries()
    ])
    customers.value = customerRows
    orders.value = orderRows
  } catch (err) {
    throw new Error(describeCustomerError(err))
  }
})

const visibleRows = computed(() =>
  customers.value
    .filter((customer) => matchesCustomerSearch(customer, search.value))
    .map((customer) => ({
      customer,
      stats: customerStats(customer, orders.value)
    }))
)

const emptyCopy = computed(() => emptyCustomersCopy(search.value))

onMounted(async () => {
  await loadCustomers()
})
</script>

<style scoped>
.ios-field,
.ios-field:focus,
.ios-field:hover,
.ios-field:disabled,
input.ios-field {
  font-size: 16px !important;
}
</style>
