<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-start justify-between gap-3 mb-6">
      <div class="min-w-0">
        <NuxtLink to="/admin/orders" class="btn btn-ghost btn-sm px-0 mb-2 -ml-1">
          <Icon name="mdi:chevron-left" class="w-5 h-5" />
          Orders
        </NuxtLink>
        <h1 class="text-3xl font-bold font-mono tracking-wide break-all">
          {{ order ? orderNumber(order.id) : 'Order' }}
        </h1>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-circle shrink-0"
        aria-label="Refresh"
        :disabled="loading || saving"
        @click="loadOrder"
      >
        <Icon name="mdi:refresh" class="w-5 h-5" :class="{ 'animate-spin': loading && order }" />
      </button>
    </div>

    <PageLoadState
      :loading="loading && !order"
      :error="order ? null : error"
      :empty="!loading && !error && !order"
      empty-icon="mdi:receipt-text-outline"
      empty-title="Order not found"
      empty-description="It may have been removed, or the link is wrong"
      @retry="retry"
    >
      <template #empty-action>
        <NuxtLink to="/admin/orders" class="btn btn-primary mt-4">Back to orders</NuxtLink>
      </template>

      <div v-if="order" class="space-y-4">
        <div v-if="error" class="alert alert-error">
          <Icon name="mdi:alert-circle" class="w-5 h-5 shrink-0" />
          <span>{{ error }}</span>
          <button type="button" class="btn btn-sm" @click="retry">Retry</button>
        </div>

        <div v-if="order.status === 'pending'" class="alert">
          <Icon name="mdi:clock-outline" class="w-5 h-5 shrink-0" />
          <span>Checkout started, not paid yet. This order may never complete.</span>
        </div>

        <section class="card bg-base-100 shadow-xl" :class="order.status === 'pending' ? 'opacity-70' : ''">
          <div class="card-body p-4 gap-3">
            <div class="flex items-start justify-between gap-3">
              <h2 class="font-semibold">Customer</h2>
              <span class="badge badge-sm shrink-0" :class="orderStatusBadgeClass(order.status)">
                {{ orderStatusLabel(order.status) }}
              </span>
            </div>
            <p class="font-medium break-words">{{ orderCustomerLabel(order) }}</p>
            <a
              v-if="order.customer_email"
              class="link link-hover break-all"
              :href="`mailto:${order.customer_email}`"
            >
              {{ order.customer_email }}
            </a>
            <p v-else class="text-sm text-base-content/60">No email</p>
          </div>
        </section>

        <section class="card bg-base-100 shadow-xl" :class="order.status === 'pending' ? 'opacity-70' : ''">
          <div class="card-body p-4 gap-3">
            <h2 class="font-semibold">Ship to</h2>
            <p v-if="address" class="whitespace-pre-wrap break-words">{{ address }}</p>
            <p v-else class="text-sm text-base-content/60">No shipping address</p>
            <button
              type="button"
              class="btn btn-outline w-full"
              :disabled="!address"
              @click="copyAddress"
            >
              <Icon :name="copied ? 'mdi:check' : 'mdi:content-copy'" class="w-4 h-4" />
              {{ copied ? 'Copied' : 'Copy address' }}
            </button>
            <p v-if="copyError" class="text-error text-sm" role="alert">{{ copyError }}</p>
          </div>
        </section>

        <section class="card bg-base-100 shadow-xl" :class="order.status === 'pending' ? 'opacity-70' : ''">
          <div class="card-body p-4 gap-3">
            <h2 class="font-semibold">Items</h2>
            <p v-if="items.length === 0" class="text-sm text-base-content/60">No items on this order</p>
            <ul v-else class="space-y-3">
              <li v-for="item in items" :key="item.id" class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-medium break-words">{{ item.product_name || 'Item' }}</p>
                  <p class="text-sm text-base-content/70">
                    Qty {{ item.quantity }} · {{ formatOrderMoney(item.price_cents) }} each
                  </p>
                </div>
                <p class="shrink-0 font-medium">{{ formatOrderMoney(lineTotalCents(item)) }}</p>
              </li>
            </ul>
            <div class="divider my-0" />
            <div class="space-y-1 text-sm">
              <div class="flex justify-between gap-3">
                <span class="text-base-content/70">Subtotal</span>
                <span>{{ formatOrderMoney(subtotalCents) }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-base-content/70">Shipping</span>
                <span>{{ formatOrderMoney(shippingCents) }}</span>
              </div>
              <div class="flex justify-between gap-3 text-base font-semibold">
                <span>Total</span>
                <span>{{ formatOrderMoney(order.total_cents) }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="card bg-base-100 shadow-xl" :class="order.status === 'pending' ? 'opacity-70' : ''">
          <div class="card-body p-4 gap-2">
            <h2 class="font-semibold">Payment</h2>
            <a
              v-if="paymentUrl"
              :href="paymentUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="link link-hover break-all"
            >
              {{ order.stripe_payment_intent_id }}
            </a>
            <p v-else class="text-sm text-base-content/60">No Stripe payment id</p>
          </div>
        </section>

        <section class="card bg-base-100 shadow-xl">
          <div class="card-body p-4 gap-4">
            <h2 class="font-semibold">Timeline</h2>
            <ol class="space-y-4">
              <li v-for="event in timeline" :key="event.label" class="flex gap-3">
                <span
                  class="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0"
                  :class="event.done ? 'bg-primary' : 'bg-base-300'"
                />
                <div class="min-w-0">
                  <p class="font-medium">{{ event.label }}</p>
                  <p class="text-sm text-base-content/70">{{ event.when }}</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section class="card bg-base-100 shadow-xl">
          <div class="card-body p-4">
            <h2 class="font-semibold mb-1">Update order</h2>
            <p class="text-sm text-base-content/60 mb-4">
              Only visible to admins. Saving does not email the customer.
            </p>
            <form class="space-y-4" @submit.prevent="save">
              <div class="form-control">
                <label class="label py-1" for="order-status">
                  <span class="label-text">Status</span>
                </label>
                <select
                  id="order-status"
                  v-model="form.status"
                  class="select select-bordered w-full ios-field"
                  :disabled="saving"
                >
                  <option
                    v-if="form.status && !ORDER_STATUSES.includes(form.status)"
                    :value="form.status"
                  >
                    {{ form.status }}
                  </option>
                  <option v-for="status in ORDER_STATUSES" :key="status" :value="status">
                    {{ orderStatusLabel(status) }}
                  </option>
                </select>
              </div>

              <div class="form-control">
                <label class="label py-1" for="order-carrier">
                  <span class="label-text">Carrier</span>
                </label>
                <select
                  id="order-carrier"
                  v-model="form.carrier"
                  class="select select-bordered w-full ios-field"
                  :disabled="saving"
                >
                  <option value="">No carrier</option>
                  <option v-for="carrier in ORDER_CARRIERS" :key="carrier" :value="carrier">
                    {{ carrier }}
                  </option>
                </select>
              </div>

              <div class="form-control">
                <label class="label py-1" for="order-tracking">
                  <span class="label-text">Tracking number</span>
                </label>
                <input
                  id="order-tracking"
                  v-model="form.trackingNumber"
                  type="text"
                  autocomplete="off"
                  autocapitalize="characters"
                  spellcheck="false"
                  enterkeyhint="done"
                  class="input input-bordered w-full ios-field"
                  :disabled="saving"
                >
              </div>

              <a
                v-if="packageUrl"
                :href="packageUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-outline w-full"
              >
                <Icon name="mdi:truck-outline" class="w-4 h-4" />
                Track package
              </a>

              <div class="form-control">
                <label class="label py-1" for="order-notes">
                  <span class="label-text">Admin notes</span>
                </label>
                <textarea
                  id="order-notes"
                  v-model="form.adminNotes"
                  rows="4"
                  class="textarea textarea-bordered w-full ios-field"
                  placeholder="Packing notes, replacements, anything staff should see"
                  :disabled="saving"
                />
              </div>

              <p v-if="saveError" class="text-error text-sm" role="alert">{{ saveError }}</p>
              <p v-else-if="saveMessage" class="text-success text-sm" role="status">{{ saveMessage }}</p>

              <button type="submit" class="btn btn-primary w-full" :disabled="!canSave">
                <span v-if="saving" class="loading loading-spinner loading-sm" />
                Save
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
  ORDER_CARRIERS,
  ORDER_STATUSES,
  formatOrderDateTime,
  formatOrderMoney,
  formatShippingAddress,
  lineTotalCents,
  orderCustomerLabel,
  orderNumber,
  orderStatusBadgeClass,
  orderStatusLabel,
  orderSubtotalCents,
  stripePaymentUrl,
  trackingUrl
} from '~/utils/orders'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const route = useRoute()
const { fetchOrder, updateOrder } = useOrders()

const order = ref(null)
const saving = ref(false)
const saveError = ref('')
const saveMessage = ref('')
const copied = ref(false)
const copyError = ref('')

const emptyForm = () => ({
  status: 'pending',
  carrier: '',
  trackingNumber: '',
  adminNotes: ''
})

const form = ref(emptyForm())

const orderId = computed(() => String(route.params.id || ''))

const syncForm = (row) => {
  form.value = {
    status: ORDER_STATUSES.includes(row?.status) ? row.status : (row?.status || 'pending'),
    carrier: row?.carrier || '',
    trackingNumber: row?.tracking_number || '',
    adminNotes: row?.admin_notes || ''
  }
}

const { loading, error, load: loadOrder, retry } = usePageLoad(async () => {
  saveError.value = ''
  const id = orderId.value
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    order.value = null
    return
  }
  const row = await fetchOrder(id)
  order.value = row
  if (row) syncForm(row)
})

const items = computed(() => {
  const rows = order.value?.order_items
  if (!Array.isArray(rows)) return []
  if (rows.length === 1 && typeof rows[0]?.count === 'number') return []
  return rows
})

const address = computed(() => formatShippingAddress(order.value))

const subtotalCents = computed(() => orderSubtotalCents(items.value))

const shippingCents = computed(() => {
  const total = Number(order.value?.total_cents) || 0
  return total - subtotalCents.value
})

const paymentUrl = computed(() => stripePaymentUrl(order.value?.stripe_payment_intent_id))

const packageUrl = computed(() =>
  trackingUrl(form.value.carrier, form.value.trackingNumber)
)

const timeline = computed(() => [
  {
    label: 'Created',
    when: formatOrderDateTime(order.value?.created_at) || 'Unknown',
    done: Boolean(order.value?.created_at)
  },
  {
    label: 'Shipped',
    when: formatOrderDateTime(order.value?.shipped_at) || 'Not shipped',
    done: Boolean(order.value?.shipped_at)
  },
  {
    label: 'Delivered',
    when: formatOrderDateTime(order.value?.delivered_at) || 'Not delivered',
    done: Boolean(order.value?.delivered_at)
  }
])

const normalizedForm = computed(() => ({
  status: form.value.status,
  carrier: form.value.carrier || null,
  trackingNumber: String(form.value.trackingNumber || '').trim() || null,
  adminNotes: String(form.value.adminNotes || '').trim() || null
}))

const isChanged = computed(() => {
  if (!order.value) return false
  const next = normalizedForm.value
  return next.status !== order.value.status
    || next.carrier !== (order.value.carrier || null)
    || next.trackingNumber !== (order.value.tracking_number || null)
    || next.adminNotes !== (order.value.admin_notes || null)
})

const canSave = computed(() => !saving.value && !loading.value && isChanged.value && Boolean(form.value.status))

const copyAddress = async () => {
  copyError.value = ''
  if (!address.value) return
  try {
    await navigator.clipboard.writeText(address.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    copyError.value = 'Could not copy the address'
  }
}

const save = async () => {
  if (!canSave.value || !order.value) return
  saving.value = true
  saveError.value = ''
  saveMessage.value = ''
  try {
    const next = normalizedForm.value
    const saved = await updateOrder({
      id: order.value.id,
      status: next.status,
      carrier: next.carrier,
      trackingNumber: next.trackingNumber,
      adminNotes: next.adminNotes
    })
    if (!saved?.id) throw new Error('Could not save this order')
    order.value = {
      ...order.value,
      ...saved,
      order_items: order.value.order_items
    }
    syncForm(order.value)
    saveMessage.value = 'Saved'
  } catch (err) {
    saveError.value = err?.message || 'Could not save this order'
  } finally {
    saving.value = false
  }
}

watch(orderId, () => {
  order.value = null
  form.value = emptyForm()
  saveMessage.value = ''
  saveError.value = ''
  loadOrder()
})

onMounted(async () => {
  await loadOrder()
})
</script>

<style scoped>
.ios-field,
.ios-field:focus,
.ios-field:hover,
.ios-field:disabled,
select.ios-field,
textarea.ios-field,
input.ios-field {
  font-size: 16px !important;
}
</style>
