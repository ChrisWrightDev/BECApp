<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 class="text-4xl font-bold mb-4">Hatches</h1>
        <p class="text-base-content/70">{{ headerCopy }}</p>
      </div>
      <label class="label cursor-pointer gap-2 mt-4 md:mt-0 justify-start">
        <span class="label-text">Completed</span>
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
      <div class="max-w-4xl mx-auto">
        <ul class="timeline timeline-vertical timeline-compact timeline-snap-icon">
          <li v-for="(hatch, index) in visibleHatches" :key="hatch.id">
            <div class="timeline-start">
              <div class="text-lg font-bold">{{ hatch.eggLaidLabel || 'Date TBD' }}</div>
            </div>
            <div class="timeline-middle">
              <Icon name="mdi:check-circle" class="w-5 h-5 text-primary" />
            </div>
            <div class="timeline-end timeline-box">
              <HatchCard :hatch="hatch" />
            </div>
            <hr v-if="index < visibleHatches.length - 1" />
          </li>
        </ul>
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
