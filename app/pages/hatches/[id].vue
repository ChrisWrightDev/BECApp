<template>
  <div class="container mx-auto px-4 py-8">
    <PageLoadState
      :loading="loading"
      :error="error"
      :empty="!hatch"
      empty-icon="mdi:egg-off-outline"
      empty-title="Hatch not found"
      empty-description="This batch may have been removed or you may not have access"
      @retry="retry"
    >
      <template #empty-action>
        <NuxtLink to="/hatches" class="btn btn-primary mt-4">
          <Icon name="mdi:arrow-left" class="w-4 h-4 mr-2" />
          Back to Hatches
        </NuxtLink>
      </template>

      <div v-if="hatch" class="max-w-4xl mx-auto">
        <div class="mb-6">
          <NuxtLink to="/hatches" class="btn btn-ghost">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Hatches
          </NuxtLink>
        </div>

        <div class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div class="flex-1">
                <h1 class="text-4xl font-bold mb-4">{{ hatch.batch_code || 'Hatch batch' }}</h1>
                <div class="flex flex-wrap items-center gap-4 mb-4">
                  <div class="flex items-center text-lg">
                    <Icon name="mdi:fish" class="w-6 h-6 mr-2 text-primary" />
                    <span class="font-semibold">{{ hatch.pairName || 'Unknown pair' }}</span>
                  </div>
                  <div v-if="hatch.eggLaidLabel" class="flex items-center text-lg">
                    <Icon name="mdi:calendar" class="w-6 h-6 mr-2 text-primary" />
                    <span>{{ hatch.eggLaidLabel }}</span>
                    <span v-if="hatch.daysSinceLaid != null" class="text-base-content/70 ml-2">
                      ({{ hatch.daysSinceLaid }}d)
                    </span>
                  </div>
                </div>
                <div class="mb-4">
                  <div class="badge badge-lg capitalize" :class="statusClass">{{ hatch.status }}</div>
                  <div v-if="hatch.stage" class="badge badge-outline badge-lg ml-2 capitalize">
                    {{ formatFlag(hatch.stage) }}
                  </div>
                  <div v-if="hatch.quality_grade" class="badge badge-secondary badge-lg ml-2">
                    Grade {{ hatch.quality_grade }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="stats stats-vertical lg:stats-horizontal shadow w-full mb-6">
          <div class="stat">
            <div class="stat-title">Current</div>
            <div class="stat-value text-primary">{{ display(hatch.current_count) }}</div>
            <div class="stat-desc">Fish on hand</div>
          </div>
          <div class="stat">
            <div class="stat-title">Initial eggs</div>
            <div class="stat-value">{{ display(hatch.initial_egg_count) }}</div>
            <div class="stat-desc">Laid count</div>
          </div>
          <div class="stat">
            <div class="stat-title">Hatched</div>
            <div class="stat-value">{{ display(hatch.hatch_count) }}</div>
            <div class="stat-desc">Survival {{ hatch.survival_rate_percent != null ? `${hatch.survival_rate_percent}%` : '—' }}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title mb-4">Pair & tanks</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:fish" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">Pair</h3>
                      <p class="text-base-content">{{ display(hatch.pairName) }}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:water" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">Parent tank</h3>
                      <p class="text-base-content">{{ display(hatch.parentTankLabel) }}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:water" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">Hatch tank</h3>
                      <p class="text-base-content">{{ display(hatch.hatchTankLabel) }}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:water" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">Current tank</h3>
                      <p class="text-base-content">{{ display(hatch.currentTankLabel) }}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:swap-horizontal" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">Transfer from</h3>
                      <p class="text-base-content">{{ display(hatch.transfer_from_tank_label) }}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:swap-horizontal" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">Transfer to</h3>
                      <p class="text-base-content">{{ display(hatch.transfer_to_tank_label) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title mb-4">Dates</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:calendar" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">Eggs laid</h3>
                      <p class="text-base-content">{{ display(hatch.eggLaidLabel) }}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:calendar" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">Hatch</h3>
                      <p class="text-base-content">{{ display(hatch.hatchDateLabel) }}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:calendar" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">First feed</h3>
                      <p class="text-base-content">{{ display(hatch.firstFeedLabel) }}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:calendar" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">Transfer</h3>
                      <p class="text-base-content">{{ display(hatch.transferDateLabel) }}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:calendar" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">Grow-out</h3>
                      <p class="text-base-content">{{ display(hatch.growoutDateLabel) }}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:calendar" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">Ready for sale</h3>
                      <p class="text-base-content">{{ display(hatch.readyForSaleLabel) }}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:timer-sand" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h3 class="font-semibold text-sm text-base-content/70">Days to hatch</h3>
                      <p class="text-base-content">{{ display(hatch.days_to_hatch) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title mb-4">Transfer history</h2>
                <ol v-if="hatch.transferHistory.length" class="space-y-3">
                  <li
                    v-for="(entry, index) in hatch.transferHistory"
                    :key="`${entry.date}-${index}`"
                    class="card bg-base-200 shadow"
                  >
                    <div class="card-body p-4">
                      <div class="font-semibold">{{ entry.dateLabel || 'Undated' }}</div>
                      <div class="text-sm text-base-content/70">
                        {{ entry.from || '—' }} → {{ entry.to || '—' }}
                        <span v-if="entry.count != null"> · {{ entry.count }}</span>
                      </div>
                      <p v-if="entry.notes" class="text-xs text-base-content/60 mt-1">{{ entry.notes }}</p>
                    </div>
                  </li>
                </ol>
                <p v-else class="text-center py-8 text-base-content/70">No transfers recorded</p>
              </div>
            </div>

            <div v-if="hatch.internal_notes" class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title mb-4">Internal notes</h2>
                <p class="text-base-content/80 leading-relaxed whitespace-pre-wrap">{{ hatch.internal_notes }}</p>
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h3 class="card-title mb-4">Counts</h3>
                <div class="space-y-4">
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:egg" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <div class="font-semibold text-sm">Initial eggs</div>
                      <div class="text-sm text-base-content/70">{{ display(hatch.initial_egg_count) }}</div>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:egg-outline" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <div class="font-semibold text-sm">Hatched</div>
                      <div class="text-sm text-base-content/70">{{ display(hatch.hatch_count) }}</div>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:swap-horizontal" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <div class="font-semibold text-sm">Transferred</div>
                      <div class="text-sm text-base-content/70">{{ display(hatch.transferred_count) }}</div>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:fish" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <div class="font-semibold text-sm">Current</div>
                      <div class="text-sm text-base-content/70">{{ display(hatch.current_count) }}</div>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:minus-circle-outline" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <div class="font-semibold text-sm">Culled</div>
                      <div class="text-sm text-base-content/70">{{ display(hatch.culled_count) }}</div>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <Icon name="mdi:heart-broken" class="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <div class="font-semibold text-sm">Mortality</div>
                      <div class="text-sm text-base-content/70">{{ display(hatch.mortality_count) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h3 class="card-title mb-4">Quality</h3>
                <div v-if="hatch.qualityFlags.length" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="flag in hatch.qualityFlags"
                    :key="flag"
                    class="badge badge-warning badge-outline"
                  >
                    {{ formatFlag(flag) }}
                  </span>
                </div>
                <p v-else class="text-sm text-base-content/70">No quality flags</p>
              </div>
            </div>
          </div>
        </div>
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
const hatch = ref(null)
const { fetchHatchById } = useHatches()
const { loading, error, load, retry } = usePageLoad(async () => {
  const { data, error: fetchError } = await fetchHatchById(route.params.id)
  if (fetchError) throw fetchError
  hatch.value = data
})

const display = (value) => {
  if (value === 0) return '0'
  return value || '—'
}

const formatFlag = (value) => String(value || '').replace(/_/g, ' ')

const statusClass = computed(() => {
  const status = hatch.value?.status
  if (status === 'active') return 'badge-success'
  if (status === 'watch') return 'badge-warning'
  if (status === 'completed') return 'badge-info'
  if (status === 'failed') return 'badge-error'
  return 'badge-ghost'
})

onMounted(load)
</script>
