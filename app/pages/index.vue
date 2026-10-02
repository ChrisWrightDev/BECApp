<template>
  <div class="container mx-auto">
    <div
      class="hero min-h-[40vh] md:min-h-[70vh] mb-4 overflow-hidden relative"
      style="background-image: url('/images/hero-reef.png'); background-size: cover; background-position: center;"
      aria-label="Blue Eyed Clowns"
    >
      <div class="hero-overlay bg-black/30"></div>
      <div class="hero-content text-center relative z-10 w-full">
        <div class="max-w-4xl">
          <h1 class="pirate-font-light text-5xl sm:text-7xl font-semibold tracking-wide">Blue Eyed Clowns</h1>
          <p class="pirate-font-light text-2xl sm:text-3xl mt-3">Clownfish hatchery</p>
        </div>
      </div>
    </div>

    <div class="px-4 sm:px-6 lg:px-8 pb-8">
      <ReminderAttentionCard />

      <div class="flex items-center gap-3 mb-4">
        <Icon name="mdi:egg-outline" class="w-6 h-6 text-primary" />
        <h2 class="text-2xl font-bold">Active hatches</h2>
        <div class="badge badge-primary">{{ summaryStats.activeCount }}</div>
        <NuxtLink to="/hatches" class="btn btn-outline btn-sm ml-auto">View All →</NuxtLink>
      </div>
      <p class="text-base-content/70 mb-6">Current batches that are not completed, failed, or archived</p>

      <PageLoadState
        :loading="loading"
        :error="error"
        :empty="currentHatches.length === 0"
        empty-icon="mdi:egg-outline"
        empty-title="No active hatches"
        empty-description="Current clutches will show up here once they are recorded"
        @retry="retry"
      >
        <div class="stats stats-vertical sm:stats-horizontal shadow w-full mb-6">
          <div class="stat">
            <div class="stat-title">Active hatches</div>
            <div class="stat-value text-primary">{{ summaryStats.activeCount }}</div>
            <div class="stat-desc">Not completed, failed, or archived</div>
          </div>
          <div class="stat">
            <div class="stat-title">Est. fish / eggs</div>
            <div class="stat-value text-secondary">{{ summaryStats.totalEstimate }}</div>
            <div class="stat-desc">Across current batches</div>
          </div>
        </div>

        <div v-if="stageBadges.length" class="flex flex-wrap gap-2 mb-6">
          <span
            v-for="item in stageBadges"
            :key="item.stage"
            class="badge badge-outline capitalize"
          >
            {{ item.count }} {{ item.stage }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HatchCard
            v-for="hatch in currentHatches"
            :key="hatch.id"
            :hatch="hatch"
            compact
          />
        </div>
      </PageLoadState>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { currentHatches, summaryStats, fetchHatches } = useHatches()
const { loading, error, load, retry } = usePageLoad(async () => {
  const { error: fetchError } = await fetchHatches()
  if (fetchError) throw fetchError
})

const stageBadges = computed(() =>
  Object.entries(summaryStats.value.byStage || {})
    .sort((a, b) => b[1] - a[1])
    .map(([stage, count]) => ({ stage: stage.replace(/_/g, ' '), count }))
)

onMounted(load)
</script>
