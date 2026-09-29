<template>
  <div>
    <section class="home-hero" aria-label="Blue Eyed Clowns">
      <div class="home-hero-overlay"></div>
      <div class="home-hero-content">
        <h1>Blue Eyed Clowns</h1>
        <p>Clownfish hatchery</p>
      </div>
    </section>

    <section class="home-body">
      <div class="page-header">
        <h2 class="text-xl font-bold">Active hatches</h2>
        <p>Current batches that are not completed, failed, or archived</p>
      </div>

      <PageLoadState
        :loading="loading"
        :error="error"
        :empty="currentHatches.length === 0"
        empty-icon="mdi:egg-outline"
        empty-title="No active hatches"
        empty-description="Current clutches will show up here once they are recorded"
        @retry="retry"
      >
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div class="stat-chip">
            <div class="label">Active hatches</div>
            <div class="value">{{ summaryStats.activeCount }}</div>
          </div>
          <div class="stat-chip">
            <div class="label">Est. fish / eggs</div>
            <div class="value">{{ summaryStats.totalEstimate }}</div>
          </div>
        </div>
        <div v-if="stageBadges.length" class="flex flex-wrap gap-1.5 mb-4">
          <span
            v-for="item in stageBadges"
            :key="item.stage"
            class="badge badge-outline badge-sm capitalize"
          >
            {{ item.count }} {{ item.stage }}
          </span>
        </div>

        <div class="space-y-3">
          <HatchCard
            v-for="hatch in currentHatches"
            :key="hatch.id"
            :hatch="hatch"
            compact
          />
        </div>
      </PageLoadState>
    </section>
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

<style scoped>
.home-hero {
  position: relative;
  min-height: 13.5rem;
  display: flex;
  align-items: flex-end;
  background-image: url('/images/hero-reef.png');
  background-size: cover;
  background-position: center;
  color: #f8fafc;
}

.home-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.15) 0%, rgba(2, 6, 23, 0.72) 100%);
}

.home-hero-content {
  position: relative;
  z-index: 1;
  padding: 1.5rem 1rem 1.25rem;
}

.home-hero h1 {
  margin: 0;
  font-size: 1.85rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.home-hero p {
  margin: 0.3rem 0 0;
  color: #cbd5e1;
  font-size: 0.95rem;
}

.home-body {
  max-width: 42rem;
  margin: 0 auto;
  padding: 1rem 1rem 0;
}

@media (min-width: 640px) {
  .home-hero {
    min-height: 18rem;
  }
}
</style>
