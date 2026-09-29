<template>
  <div>
    <div class="page-header flex items-start justify-between gap-3">
      <div>
        <h1>Hatches</h1>
        <p>{{ headerCopy }}</p>
      </div>
      <label class="label cursor-pointer gap-2 py-0">
        <span class="label-text text-xs">Completed</span>
        <input
          v-model="showCompleted"
          type="checkbox"
          class="toggle toggle-sm toggle-primary"
        />
      </label>
    </div>

    <PageLoadState
      :loading="loading"
      :error="error"
      :empty="visibleHatches.length === 0"
      empty-icon="mdi:egg-outline"
      empty-title="No hatches to show"
      empty-description="Hatch batches will appear here once they are recorded"
      @retry="retry"
    >
      <div class="space-y-3">
        <HatchCard
          v-for="hatch in visibleHatches"
          :key="hatch.id"
          :hatch="hatch"
        />
      </div>
    </PageLoadState>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const showCompleted = ref(false)
const { hatches, currentHatches, fetchHatches } = useHatches()
const { loading, error, load, retry } = usePageLoad(async () => {
  const { error: fetchError } = await fetchHatches()
  if (fetchError) throw fetchError
})

const visibleHatches = computed(() =>
  showCompleted.value ? hatches.value : currentHatches.value
)

const headerCopy = computed(() =>
  showCompleted.value
    ? `${hatches.value.length} batches including completed`
    : `${currentHatches.value.length} current batches`
)

const scrollToHash = () => {
  const id = route.hash?.replace('#', '')
  if (!id) return
  nextTick(() => {
    const el = document.getElementById(id) || document.querySelector(`[href="/hatches/${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

onMounted(async () => {
  await load()
  scrollToHash()
})

watch(() => route.hash, scrollToHash)
</script>
