<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <h1 class="text-4xl font-bold mb-4">Prices</h1>
        <p class="text-base-content/70">
          Single clownfish catalog prices.
          <NuxtLink to="/admin/pairs-shop" class="link link-hover text-primary">
            Manage bonded pairs
          </NuxtLink>
        </p>
      </div>
      <button
        type="button"
        class="btn btn-primary w-full sm:w-auto"
        :disabled="!canSaveAll"
        @click="saveAllChanged"
      >
        <span v-if="savingAll" class="loading loading-spinner loading-sm"></span>
        Save all changed
      </button>
    </div>

    <PageLoadState
      :loading="loading"
      :error="error"
      :empty="rows.length === 0"
      empty-icon="mdi:currency-usd"
      empty-title="No clownfish found"
      empty-description="Catalog items will appear here once they are added"
      @retry="retry"
    >
      <div class="space-y-6">
        <section v-for="group in groupedRows" :key="group.pattern">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-base-content/60 mb-2">
            {{ group.pattern }}
          </h2>
          <div class="space-y-3">
            <div
              v-for="row in group.rows"
              :key="row.id"
              class="card bg-base-100 shadow-xl"
            >
              <div class="card-body p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h3 class="font-semibold break-words">{{ row.name }}</h3>
                    <div class="flex flex-wrap gap-1 mt-2">
                      <span class="badge badge-sm badge-ghost">Single</span>
                      <span
                        class="badge badge-sm"
                        :class="row.in_stock ? 'badge-success' : 'badge-ghost'"
                      >
                        {{ row.in_stock ? 'In stock' : 'Out of stock' }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="mt-4">
                  <label class="label py-1" :for="`price-${row.id}`">
                    <span class="label-text">Price (USD)</span>
                  </label>
                  <label class="input input-bordered flex items-center gap-2 w-full price-field">
                    <span class="text-base-content/60" aria-hidden="true">$</span>
                    <input
                      :id="`price-${row.id}`"
                      v-model="row.dollars"
                      type="text"
                      inputmode="decimal"
                      autocomplete="off"
                      enterkeyhint="done"
                      class="grow price-input min-w-0"
                      :aria-invalid="Boolean(rowValidation(row))"
                      :disabled="row.saving || savingAll"
                      @input="onPriceInput(row)"
                    />
                  </label>
                </div>

                <div class="mt-3">
                  <button
                    type="button"
                    class="btn btn-primary w-full"
                    :disabled="!canSaveRow(row)"
                    @click="saveRow(row)"
                  >
                    <span v-if="row.saving" class="loading loading-spinner loading-sm"></span>
                    Save
                  </button>
                </div>

                <p
                  v-if="rowValidation(row)"
                  class="text-error text-sm mt-2"
                >
                  {{ rowValidation(row) }}
                </p>
                <p
                  v-else-if="row.feedback"
                  class="text-sm mt-2"
                  :class="row.feedback.type === 'success' ? 'text-success' : 'text-error'"
                >
                  {{ row.feedback.message }}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageLoadState>
  </div>
</template>

<script setup>
import { withTimeout } from '~/utils/loadState'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const PRICE_CENTS_MAX = 10000000
const DOLLAR_PATTERN = /^\d+(\.\d{1,2})?$/

const supabase = useSupabaseClient()
const rows = ref([])
const savingAll = ref(false)

const centsToDollars = (cents) => {
  if (cents == null || !Number.isFinite(Number(cents))) return ''
  return (Number(cents) / 100).toFixed(2)
}

const parsePriceCents = (raw) => {
  const trimmed = String(raw ?? '').trim().replace(/^\$/, '').trim()
  if (!trimmed) return { ok: false, reason: 'Enter a price' }
  if (/\.\d{3,}/.test(trimmed)) {
    return { ok: false, reason: 'Use at most 2 decimal places' }
  }
  if (!DOLLAR_PATTERN.test(trimmed)) {
    return { ok: false, reason: 'Enter a valid dollar amount' }
  }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0.01) {
    return { ok: false, reason: 'Minimum is $0.01' }
  }
  const cents = Math.round(value * 100)
  if (cents <= 0 || cents > PRICE_CENTS_MAX) {
    return { ok: false, reason: 'Price is out of range' }
  }
  return { ok: true, cents }
}

const isBondedPair = (item) =>
  item.pattern === 'Bonded Pairs Available' || (item.name || '').includes('Bonded Pair')

const isValid = (row) => parsePriceCents(row.dollars).ok

const isChanged = (row) => {
  const parsed = parsePriceCents(row.dollars)
  if (!parsed.ok) return true
  return parsed.cents !== row.price_cents
}

const canSaveRow = (row) =>
  !row.saving && !savingAll.value && isChanged(row) && isValid(row)

const rowValidation = (row) => {
  if (!isChanged(row)) return ''
  const parsed = parsePriceCents(row.dollars)
  return parsed.ok ? '' : parsed.reason
}

const mapRow = (item) => ({
  id: item.id,
  name: item.name,
  pattern: item.pattern,
  price_cents: item.price_cents,
  in_stock: item.in_stock,
  dollars: centsToDollars(item.price_cents),
  saving: false,
  feedback: null
})

const groupedRows = computed(() => {
  const groups = []
  const indexByPattern = new Map()
  for (const row of rows.value) {
    const pattern = row.pattern || 'Uncategorized'
    if (!indexByPattern.has(pattern)) {
      indexByPattern.set(pattern, groups.length)
      groups.push({ pattern, rows: [] })
    }
    groups[indexByPattern.get(pattern)].rows.push(row)
  }
  return groups
})

const changedValidRows = computed(() =>
  rows.value.filter((row) => isChanged(row) && isValid(row) && !row.saving)
)

const canSaveAll = computed(() =>
  !savingAll.value && changedValidRows.value.length > 0
)

const { loading, error, load: loadPrices, retry } = usePageLoad(async () => {
  const { data, error: fetchError } = await supabase
    .from('clownfish')
    .select('id, name, pattern, price_cents, in_stock')
    .order('pattern', { ascending: true })
    .order('name', { ascending: true })

  if (fetchError) throw fetchError
  rows.value = (data || []).filter((item) => !isBondedPair(item)).map(mapRow)
})

const onPriceInput = (row) => {
  row.feedback = null
}

const saveRow = async (row) => {
  const parsed = parsePriceCents(row.dollars)
  if (!parsed.ok) {
    row.feedback = { type: 'error', message: parsed.reason }
    return false
  }
  if (parsed.cents === row.price_cents) return true

  row.saving = true
  row.feedback = null
  try {
    const { data, error: rpcError } = await withTimeout(
      supabase.rpc('admin_set_clownfish_price', {
        p_id: row.id,
        p_price_cents: parsed.cents
      })
    )
    if (rpcError) throw rpcError
    const saved = Array.isArray(data) ? data[0] : data
    row.price_cents = saved?.price_cents ?? parsed.cents
    row.dollars = centsToDollars(row.price_cents)
    row.feedback = { type: 'success', message: 'Saved' }
    return true
  } catch (err) {
    row.feedback = { type: 'error', message: err?.message || 'Failed to save price' }
    return false
  } finally {
    row.saving = false
  }
}

const saveAllChanged = async () => {
  if (!canSaveAll.value) return
  savingAll.value = true
  try {
    const targets = rows.value.filter((row) => isChanged(row) && isValid(row) && !row.saving)
    for (const row of targets) {
      await saveRow(row)
    }
  } finally {
    savingAll.value = false
  }
}

onMounted(async () => {
  await loadPrices()
})
</script>

<style scoped>
.price-field,
.price-input,
.price-input:focus,
.price-input:hover,
.price-input:disabled {
  font-size: 16px !important;
}
</style>
