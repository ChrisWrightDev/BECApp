<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-start justify-between gap-3 mb-6">
      <div class="min-w-0">
        <NuxtLink to="/admin/customers" class="btn btn-ghost btn-sm px-0 mb-2 -ml-1">
          <Icon name="mdi:chevron-left" class="w-5 h-5" />
          Customers
        </NuxtLink>
        <h1 class="text-3xl font-bold break-words">
          {{ customer ? customerLabel(customer) : 'Customer' }}
        </h1>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-circle shrink-0"
        aria-label="Refresh"
        :disabled="loading || saving"
        @click="loadCustomer"
      >
        <Icon name="mdi:refresh" class="w-5 h-5" :class="{ 'animate-spin': loading && customer }" />
      </button>
    </div>

    <PageLoadState
      :loading="loading && !customer"
      :error="customer ? null : error"
      :empty="!loading && !error && !customer"
      empty-icon="mdi:account-multiple-outline"
      empty-title="Customer not found"
      empty-description="It may have been removed, or the link is wrong"
      @retry="retry"
    >
      <template #empty-action>
        <NuxtLink to="/admin/customers" class="btn btn-primary mt-4">Back to customers</NuxtLink>
      </template>

      <div v-if="customer" class="space-y-4">
        <div v-if="error" class="alert alert-error">
          <Icon name="mdi:alert-circle" class="w-5 h-5 shrink-0" />
          <span>{{ error }}</span>
          <button type="button" class="btn btn-sm" @click="retry">Retry</button>
        </div>

        <section class="card bg-base-100 shadow-xl">
          <div class="card-body p-4 gap-3">
            <h2 class="font-semibold">Contact</h2>
            <p class="font-medium break-words">{{ customerLabel(customer) }}</p>
            <a
              v-if="emailHref"
              class="btn btn-outline w-full overflow-hidden"
              :href="emailHref"
            >
              <Icon name="mdi:email-outline" class="w-5 h-5 shrink-0" />
              <span class="truncate min-w-0">{{ customer.email }}</span>
            </a>
            <p v-else-if="customer.email" class="text-sm break-all">{{ customer.email }}</p>
            <p v-else class="text-sm text-base-content/60">No email</p>
            <a
              v-if="phoneHref"
              class="btn btn-outline w-full overflow-hidden"
              :href="phoneHref"
            >
              <Icon name="mdi:phone" class="w-5 h-5 shrink-0" />
              <span class="truncate min-w-0">Call {{ customer.phone }}</span>
            </a>
            <p v-else-if="customer.phone" class="text-sm break-all">{{ customer.phone }}</p>
            <p class="text-sm text-base-content/70">
              {{ sourceLabel(customer.source) }}
              · Added {{ formatOrderDate(customer.created_at) }}
            </p>
          </div>
        </section>

        <section class="card bg-base-100 shadow-xl">
          <div class="card-body p-4 gap-3">
            <h2 class="font-semibold">Orders</h2>
            <p class="text-base">{{ customerSpendLabel(stats) }}</p>
            <p class="text-sm text-base-content/60">
              Paid, processing, shipped, and delivered orders linked by customer or email.
            </p>
            <p v-if="stats.matched.length === 0" class="text-sm text-base-content/60">
              No orders linked to this customer
            </p>
            <ul v-else class="space-y-2">
              <li v-for="order in stats.matched" :key="order.id">
                <NuxtLink
                  :to="`/admin/orders/${order.id}`"
                  class="flex items-start justify-between gap-3 rounded-box bg-base-200 px-3 py-3"
                >
                  <div class="min-w-0">
                    <p class="font-mono font-semibold tracking-wide">{{ orderNumber(order.id) }}</p>
                    <p class="text-sm text-base-content/70">
                      {{ formatOrderDate(order.created_at) }}
                      · {{ formatOrderMoney(order.total_cents) }}
                    </p>
                  </div>
                  <span class="badge badge-sm shrink-0" :class="orderStatusBadgeClass(order.status)">
                    {{ orderStatusLabel(order.status) }}
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </section>

        <section class="card bg-base-100 shadow-xl">
          <div class="card-body p-4">
            <h2 class="font-semibold mb-1">Notes</h2>
            <p class="text-sm text-base-content/60 mb-4">
              Only visible to admins. Saving does not email the customer.
            </p>
            <form class="space-y-4" @submit.prevent="saveNotes">
              <div class="form-control">
                <label class="label py-1" for="customer-notes">
                  <span class="label-text">Notes</span>
                </label>
                <textarea
                  id="customer-notes"
                  v-model="notes"
                  rows="4"
                  class="textarea textarea-bordered w-full ios-field"
                  placeholder="Preferences, wholesale terms, anything staff should see"
                  :disabled="saving"
                />
              </div>
              <p v-if="saveError" class="text-error text-sm" role="alert">{{ saveError }}</p>
              <p v-else-if="saveMessage" class="text-success text-sm" role="status">{{ saveMessage }}</p>
              <button type="submit" class="btn btn-primary w-full" :disabled="!canSave">
                <span v-if="saving" class="loading loading-spinner loading-sm" />
                Save notes
              </button>
            </form>
          </div>
        </section>
      </div>
    </PageLoadState>
  </div>
</template>

<script setup>
import {
  formatOrderDate,
  formatOrderMoney,
  orderNumber,
  orderStatusBadgeClass,
  orderStatusLabel
} from '~/utils/orders'
import {
  customerLabel,
  customerSpendLabel,
  customerStats,
  describeCustomerError,
  isUuid,
  mailtoAddress,
  sourceLabel,
  telHref
} from '~/utils/inbox'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const route = useRoute()
const { fetchCustomer, fetchOrderSummaries, updateCustomerNotes } = useCustomers()

const customer = ref(null)
const orders = ref([])
const notes = ref('')
const saving = ref(false)
const saveError = ref('')
const saveMessage = ref('')

const customerId = computed(() => String(route.params.id || ''))

const syncNotes = (row) => {
  notes.value = row?.notes || ''
}

const { loading, error, load: loadCustomer, retry } = usePageLoad(async () => {
  saveError.value = ''
  const id = customerId.value
  if (!isUuid(id)) {
    customer.value = null
    orders.value = []
    return
  }
  try {
    const [row, orderRows] = await Promise.all([
      fetchCustomer(id),
      fetchOrderSummaries()
    ])
    customer.value = row
    orders.value = orderRows
    if (row) syncNotes(row)
  } catch (err) {
    throw new Error(describeCustomerError(err))
  }
})

const stats = computed(() => customerStats(customer.value, orders.value))

const emailHref = computed(() => mailtoAddress(customer.value?.email))

const phoneHref = computed(() => telHref(customer.value?.phone))

const normalizedNotes = computed(() => String(notes.value || '').trim() || null)

const notesChanged = computed(() => {
  if (!customer.value) return false
  return normalizedNotes.value !== (customer.value.notes || null)
})

const canSave = computed(() => !saving.value && !loading.value && notesChanged.value)

const saveNotes = async () => {
  if (!canSave.value || !customer.value) return
  saving.value = true
  saveError.value = ''
  saveMessage.value = ''
  try {
    const saved = await updateCustomerNotes(customer.value.id, normalizedNotes.value)
    customer.value = { ...customer.value, ...saved }
    syncNotes(customer.value)
    saveMessage.value = 'Saved'
  } catch (err) {
    saveError.value = describeCustomerError(err)
  } finally {
    saving.value = false
  }
}

watch(customerId, () => {
  customer.value = null
  orders.value = []
  notes.value = ''
  saveMessage.value = ''
  saveError.value = ''
  loadCustomer()
})

onMounted(async () => {
  await loadCustomer()
})
</script>

<style scoped>
.ios-field,
.ios-field:focus,
.ios-field:hover,
.ios-field:disabled,
textarea.ios-field {
  font-size: 16px !important;
}
</style>
