<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-4">Admin</h1>
      <p class="text-base-content/70">Orders, website inbox, users, tanks, prices, and pairs</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <NuxtLink to="/admin/orders" class="block hover:opacity-80">
            <h2 class="card-title">
              <Icon name="mdi:receipt-text-outline" class="w-6 h-6 text-primary" />
              Orders
            </h2>
            <p v-if="countLoading" class="text-base-content/70">Checking orders…</p>
            <p v-else-if="countError" class="text-error">{{ countError }}</p>
            <p v-else class="text-base-content/70">{{ actionLabel }}</p>
            <p v-if="!countLoading && !countError" class="text-sm text-base-content/60">Paid and processing shop orders</p>
          </NuxtLink>
          <button
            v-if="countError"
            type="button"
            class="btn btn-sm mt-2 w-fit"
            @click="loadCount"
          >
            Retry
          </button>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <NuxtLink to="/admin/inquiries" class="block hover:opacity-80">
            <h2 class="card-title">
              <Icon name="mdi:inbox" class="w-6 h-6 text-primary" />
              Inquiries
              <span
                v-if="!inquiryLoading && !inquiryError && newInquiryCount > 0"
                class="badge badge-error badge-sm"
              >
                {{ newInquiryCount > 99 ? '99+' : newInquiryCount }}
              </span>
            </h2>
            <p v-if="inquiryLoading" class="text-base-content/70">Checking inquiries…</p>
            <p v-else-if="inquiryError" class="text-error">{{ inquiryError }}</p>
            <p v-else class="text-base-content/70">{{ inquiryLabel }}</p>
            <p v-if="!inquiryLoading && !inquiryError" class="text-sm text-base-content/60">Messages from the website</p>
          </NuxtLink>
          <button
            v-if="inquiryError"
            type="button"
            class="btn btn-sm mt-2 w-fit"
            @click="loadInquiries"
          >
            Retry
          </button>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <NuxtLink to="/admin/subscribers" class="block hover:opacity-80">
            <h2 class="card-title">
              <Icon name="mdi:email-newsletter" class="w-6 h-6 text-primary" />
              Subscribers
            </h2>
            <p v-if="subscriberLoading" class="text-base-content/70">Checking subscribers…</p>
            <p v-else-if="subscriberError" class="text-error">{{ subscriberError }}</p>
            <p v-else class="text-base-content/70">{{ subscriberLabel }}</p>
            <p v-if="!subscriberLoading && !subscriberError" class="text-sm text-base-content/60">Release list</p>
          </NuxtLink>
          <button
            v-if="subscriberError"
            type="button"
            class="btn btn-sm mt-2 w-fit"
            @click="loadSubscribers"
          >
            Retry
          </button>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <NuxtLink to="/admin/customers" class="block hover:opacity-80">
            <h2 class="card-title">
              <Icon name="mdi:account-multiple-outline" class="w-6 h-6 text-primary" />
              Customers
            </h2>
            <p v-if="customerLoading" class="text-base-content/70">Checking customers…</p>
            <p v-else-if="customerError" class="text-error">{{ customerError }}</p>
            <p v-else class="text-base-content/70">{{ customerLabel }}</p>
            <p v-if="!customerLoading && !customerError" class="text-sm text-base-content/60">Shop customers and notes</p>
          </NuxtLink>
          <button
            v-if="customerError"
            type="button"
            class="btn btn-sm mt-2 w-fit"
            @click="loadCustomers"
          >
            Retry
          </button>
        </div>
      </div>

      <NuxtLink to="/admin/users" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <div class="card-body">
          <h2 class="card-title">
            <Icon name="mdi:account-group" class="w-6 h-6 text-primary" />
            Users
          </h2>
          <p class="text-base-content/70">Manage accounts and roles</p>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/tanks" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <div class="card-body">
          <h2 class="card-title">
            <Icon name="mdi:water" class="w-6 h-6 text-primary" />
            Tanks
          </h2>
          <p class="text-base-content/70">Labels, bank layout, and roles</p>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/prices" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <div class="card-body">
          <h2 class="card-title">
            <Icon name="mdi:currency-usd" class="w-6 h-6 text-primary" />
            Prices
          </h2>
          <p class="text-base-content/70">Edit clownfish catalog prices</p>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/pairs" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <div class="card-body">
          <h2 class="card-title">
            <Icon name="mdi:fish" class="w-6 h-6 text-primary" />
            Mated Pairs
          </h2>
          <p class="text-base-content/70">Hatchery mated pairs and clutches</p>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/pairs-shop" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <div class="card-body">
          <h2 class="card-title">
            <Icon name="mdi:storefront" class="w-6 h-6 text-primary" />
            Bonded Pairs (Shop)
          </h2>
          <p class="text-base-content/70">Manage shop pairs and videos</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { countPhrase, describeCustomerError } from '~/utils/inbox'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const { fetchActionCount } = useOrders()
const { fetchNewInquiryCount, newInquiryCount } = useInquiries()
const { fetchSubscribedCount } = useSubscribers()
const { fetchCustomerCount } = useCustomers()

const actionCount = ref(0)
const countLoading = ref(true)
const countError = ref('')

const inquiryLoading = ref(true)
const inquiryError = ref('')

const subscriberCount = ref(0)
const subscriberLoading = ref(true)
const subscriberError = ref('')

const customerCount = ref(0)
const customerLoading = ref(true)
const customerError = ref('')

const actionLabel = computed(() => {
  const count = actionCount.value
  if (count === 1) return '1 needs action'
  if (!count) return 'No orders need action'
  return `${count} need action`
})

const inquiryLabel = computed(() => {
  if (!newInquiryCount.value) return 'No new inquiries'
  return countPhrase(newInquiryCount.value, 'new inquiry', 'new inquiries')
})

const subscriberLabel = computed(() => {
  if (!subscriberCount.value) return 'No one subscribed'
  if (subscriberCount.value === 1) return '1 subscribed'
  return `${subscriberCount.value} subscribed`
})

const customerLabel = computed(() => {
  if (!customerCount.value) return 'No customers yet'
  return countPhrase(customerCount.value, 'customer', 'customers')
})

const loadCount = async () => {
  countLoading.value = true
  countError.value = ''
  try {
    actionCount.value = await fetchActionCount()
  } catch (err) {
    countError.value = err?.message || 'Could not load orders'
  } finally {
    countLoading.value = false
  }
}

const loadInquiries = async () => {
  inquiryLoading.value = true
  inquiryError.value = ''
  try {
    await fetchNewInquiryCount()
  } catch (err) {
    inquiryError.value = err?.message || 'Could not load inquiries'
  } finally {
    inquiryLoading.value = false
  }
}

const loadSubscribers = async () => {
  subscriberLoading.value = true
  subscriberError.value = ''
  try {
    subscriberCount.value = await fetchSubscribedCount()
  } catch (err) {
    subscriberError.value = err?.message || 'Could not load subscribers'
  } finally {
    subscriberLoading.value = false
  }
}

const loadCustomers = async () => {
  customerLoading.value = true
  customerError.value = ''
  try {
    customerCount.value = await fetchCustomerCount()
  } catch (err) {
    customerError.value = describeCustomerError(err)
  } finally {
    customerLoading.value = false
  }
}

onMounted(() => {
  loadCount()
  loadInquiries()
  loadSubscribers()
  loadCustomers()
})
</script>
