<template>
  <NuxtLink :to="`/hatches/${hatch.id}`" :id="hatch.id" class="hatch-card" :class="{ compact }">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="font-semibold text-base leading-tight truncate">
          {{ hatch.batch_code || 'Untitled batch' }}
        </h3>
        <p class="text-sm text-base-content/70 mt-0.5 truncate">
          {{ hatch.pairName || 'Unknown pair' }}
        </p>
      </div>
      <span class="badge badge-sm shrink-0 capitalize" :class="statusClass">
        {{ hatch.status }}
      </span>
    </div>

    <div class="flex flex-wrap gap-1.5 mt-3">
      <span v-if="hatch.stage" class="badge badge-outline badge-sm capitalize">
        {{ formatFlag(hatch.stage) }}
      </span>
      <span v-if="hatch.parentTankLabel" class="badge badge-ghost badge-sm">
        <Icon name="mdi:water" class="w-3 h-3 mr-1" />
        {{ hatch.parentTankLabel }}
      </span>
      <span v-if="hatch.current_count != null" class="badge badge-ghost badge-sm">
        {{ hatch.current_count }} fish
      </span>
      <span v-else-if="hatch.estimatedCount" class="badge badge-ghost badge-sm">
        ~{{ hatch.estimatedCount }}
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-base-content/60">
      <span v-if="hatch.eggLaidLabel">
        Laid {{ hatch.eggLaidLabel }}
      </span>
      <span v-if="hatch.daysSinceLaid != null">
        {{ hatch.daysSinceLaid }}d ago
      </span>
    </div>

    <div v-if="hatch.qualityFlags?.length" class="flex flex-wrap gap-1 mt-2">
      <span
        v-for="flag in hatch.qualityFlags"
        :key="flag"
        class="badge badge-warning badge-outline badge-xs"
      >
        {{ formatFlag(flag) }}
      </span>
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
