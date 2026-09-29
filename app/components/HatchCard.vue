<template>
  <NuxtLink
    :to="`/hatches/${hatch.id}`"
    :id="hatch.id"
    class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300 block"
  >
    <div class="card-body" :class="compact ? 'p-4' : ''">
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
        <div class="min-w-0">
          <h2 class="card-title text-lg">{{ hatch.batch_code || 'Untitled batch' }}</h2>
          <p class="text-sm text-base-content/70 mt-1">
            {{ hatch.pairName || 'Unknown pair' }}
          </p>
        </div>
        <span class="badge badge-lg capitalize shrink-0" :class="statusClass">
          {{ hatch.status }}
        </span>
      </div>

      <p v-if="hatch.stage" class="text-base-content/80 text-sm line-clamp-2">
        Stage: {{ formatFlag(hatch.stage) }}
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <div v-if="hatch.eggLaidLabel" class="flex items-start space-x-3">
          <Icon name="mdi:calendar" class="w-5 h-5 mt-1 text-primary" />
          <div>
            <h3 class="font-semibold text-sm text-base-content/70">Eggs laid</h3>
            <p class="text-base-content">{{ hatch.eggLaidLabel }}</p>
          </div>
        </div>
        <div v-if="hatch.parentTankLabel || hatch.currentTankLabel" class="flex items-start space-x-3">
          <Icon name="mdi:water" class="w-5 h-5 mt-1 text-primary" />
          <div>
            <h3 class="font-semibold text-sm text-base-content/70">Tank</h3>
            <p class="text-base-content">{{ hatch.currentTankLabel || hatch.parentTankLabel }}</p>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <Icon name="mdi:fish" class="w-5 h-5 mt-1 text-primary" />
          <div>
            <h3 class="font-semibold text-sm text-base-content/70">Count</h3>
            <p class="text-base-content">
              {{ hatch.current_count != null ? hatch.current_count : (hatch.estimatedCount || 0) }}
            </p>
          </div>
        </div>
        <div v-if="hatch.daysSinceLaid != null" class="flex items-start space-x-3">
          <Icon name="mdi:clock-outline" class="w-5 h-5 mt-1 text-primary" />
          <div>
            <h3 class="font-semibold text-sm text-base-content/70">Age</h3>
            <p class="text-base-content">{{ hatch.daysSinceLaid }} days</p>
          </div>
        </div>
      </div>

      <div v-if="hatch.qualityFlags?.length" class="flex flex-wrap gap-1 mt-2">
        <span
          v-for="flag in hatch.qualityFlags"
          :key="flag"
          class="badge badge-warning badge-outline badge-sm"
        >
          {{ formatFlag(flag) }}
        </span>
      </div>

      <div v-if="!compact" class="card-actions justify-end mt-2">
        <span class="btn btn-outline btn-sm">Details</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup>
const props = defineProps({
  hatch: { type: Object, required: true },
  compact: { type: Boolean, default: false }
})

const statusClass = computed(() => {
  const status = props.hatch.status
  if (status === 'active') return 'badge-success'
  if (status === 'watch') return 'badge-warning'
  if (status === 'completed') return 'badge-info'
  if (status === 'failed') return 'badge-error'
  return 'badge-ghost'
})

const formatFlag = (value) => String(value || '').replace(/_/g, ' ')
</script>
