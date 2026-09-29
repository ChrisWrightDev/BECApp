<template>
  <div>
    <NuxtLink to="/hatches" class="btn btn-ghost btn-sm px-0 mb-2">
      <Icon name="mdi:chevron-left" class="w-5 h-5" />
      Hatches
    </NuxtLink>

    <PageLoadState
      :loading="loading"
      :error="error"
      :empty="!hatch"
      empty-icon="mdi:egg-off-outline"
      empty-title="Hatch not found"
      empty-description="This batch may have been removed or you may not have access"
      @retry="retry"
    >
      <div v-if="hatch" class="space-y-3">
        <header class="page-header">
          <h1>{{ hatch.batch_code || 'Hatch batch' }}</h1>
          <p>{{ hatch.pairName || 'Unknown pair' }}</p>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span class="badge badge-sm capitalize" :class="statusClass">{{ hatch.status }}</span>
            <span v-if="hatch.stage" class="badge badge-outline badge-sm capitalize">
              {{ formatFlag(hatch.stage) }}
            </span>
            <span v-if="hatch.quality_grade" class="badge badge-secondary badge-sm">
              Grade {{ hatch.quality_grade }}
            </span>
          </div>
        </header>

        <section class="detail-section">
          <h2 class="font-semibold mb-2">Pair & tanks</h2>
          <dl>
            <div class="detail-row">
              <dt>Pair</dt>
              <dd>{{ display(hatch.pairName) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Parent tank</dt>
              <dd>{{ display(hatch.parentTankLabel) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Hatch tank</dt>
              <dd>{{ display(hatch.hatchTankLabel) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Current tank</dt>
              <dd>{{ display(hatch.currentTankLabel) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Transfer from</dt>
              <dd>{{ display(hatch.transfer_from_tank_label) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Transfer to</dt>
              <dd>{{ display(hatch.transfer_to_tank_label) }}</dd>
            </div>
          </dl>
        </section>

        <section class="detail-section">
          <h2 class="font-semibold mb-2">Dates</h2>
          <dl>
            <div class="detail-row">
              <dt>Eggs laid</dt>
              <dd>
                {{ display(hatch.eggLaidLabel) }}
                <span v-if="hatch.daysSinceLaid != null" class="block text-xs font-normal text-base-content/60">
                  {{ hatch.daysSinceLaid }} days ago
                </span>
              </dd>
            </div>
            <div class="detail-row">
              <dt>Hatch</dt>
              <dd>{{ display(hatch.hatchDateLabel) }}</dd>
            </div>
            <div class="detail-row">
              <dt>First feed</dt>
              <dd>{{ display(hatch.firstFeedLabel) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Transfer</dt>
              <dd>{{ display(hatch.transferDateLabel) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Grow-out</dt>
              <dd>{{ display(hatch.growoutDateLabel) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Ready for sale</dt>
              <dd>{{ display(hatch.readyForSaleLabel) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Days to hatch</dt>
              <dd>{{ display(hatch.days_to_hatch) }}</dd>
            </div>
          </dl>
        </section>

        <section class="detail-section">
          <h2 class="font-semibold mb-2">Counts</h2>
          <dl>
            <div class="detail-row">
              <dt>Initial eggs</dt>
              <dd>{{ display(hatch.initial_egg_count) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Hatched</dt>
              <dd>{{ display(hatch.hatch_count) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Transferred</dt>
              <dd>{{ display(hatch.transferred_count) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Current</dt>
              <dd>{{ display(hatch.current_count) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Culled</dt>
              <dd>{{ display(hatch.culled_count) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Mortality</dt>
              <dd>{{ display(hatch.mortality_count) }}</dd>
            </div>
            <div class="detail-row">
              <dt>Survival</dt>
              <dd>{{ hatch.survival_rate_percent != null ? `${hatch.survival_rate_percent}%` : '—' }}</dd>
            </div>
          </dl>
        </section>

        <section class="detail-section">
          <h2 class="font-semibold mb-2">Quality</h2>
          <div v-if="hatch.qualityFlags.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="flag in hatch.qualityFlags"
              :key="flag"
              class="badge badge-warning badge-outline badge-sm"
            >
              {{ formatFlag(flag) }}
            </span>
          </div>
          <p v-else class="text-sm text-base-content/60">No quality flags</p>
        </section>

        <section class="detail-section">
          <h2 class="font-semibold mb-2">Transfer history</h2>
          <ol v-if="hatch.transferHistory.length" class="space-y-3">
            <li
              v-for="(entry, index) in hatch.transferHistory"
              :key="`${entry.date}-${index}`"
              class="border-l-2 border-primary/30 pl-3"
            >
              <div class="text-sm font-semibold">
                {{ entry.dateLabel || 'Undated' }}
              </div>
              <div class="text-sm text-base-content/70">
                {{ entry.from || '—' }} → {{ entry.to || '—' }}
                <span v-if="entry.count != null"> · {{ entry.count }}</span>
              </div>
              <p v-if="entry.notes" class="text-xs text-base-content/60 mt-1">
                {{ entry.notes }}
              </p>
            </li>
          </ol>
          <p v-else class="text-sm text-base-content/60">No transfers recorded</p>
        </section>

        <section v-if="hatch.internal_notes" class="detail-section">
          <h2 class="font-semibold mb-2">Internal notes</h2>
          <p class="text-sm whitespace-pre-wrap">{{ hatch.internal_notes }}</p>
        </section>
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
