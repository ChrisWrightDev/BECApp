<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-4">Admin</h1>
      <p class="text-base-content/70">Users, tanks, prices, mated pairs, shop pairs, and orders</p>
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
definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const { fetchActionCount } = useOrders()
const actionCount = ref(0)
const countLoading = ref(true)
const countError = ref('')

const actionLabel = computed(() => {
  const count = actionCount.value
  if (count === 1) return '1 needs action'
  if (!count) return 'No orders need action'
  return `${count} need action`
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

onMounted(async () => {
  await loadCount()
})
</script>
