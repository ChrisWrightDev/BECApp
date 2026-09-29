<template>
  <div
    class="border-2 rounded-lg p-3 cursor-pointer select-none"
    :class="item.done ? 'border-success bg-success/5' : 'border-base-300 bg-base-200'"
    role="checkbox"
    :aria-checked="item.done"
    :aria-label="item.title"
    tabindex="0"
    @click="$emit('toggle')"
    @keydown.enter.prevent="$emit('toggle')"
    @keydown.space.prevent="$emit('toggle')"
  >
    <div class="flex items-start gap-3">
      <input
        type="checkbox"
        :checked="item.done"
        class="checkbox checkbox-primary checkbox-lg mt-1 flex-shrink-0 pointer-events-none"
        :class="{ 'checkbox-success': item.done }"
        tabindex="-1"
        aria-hidden="true"
      />
      <div class="flex-1 min-w-0">
        <div
          class="font-semibold text-base break-words"
          :class="{ 'line-through opacity-60': item.done }"
        >
          {{ item.title }}
        </div>
        <div v-if="item.detail" class="text-sm text-base-content/70 mt-1 break-words">
          {{ item.detail }}
        </div>
        <div class="flex flex-wrap gap-2 mt-2">
          <span :class="['badge badge-sm', getCategoryColor(item.category)]">
            {{ (item.category || 'other').replace('_', ' ') }}
          </span>
          <span v-if="item.tank_label" class="badge badge-sm badge-info">
            <Icon name="mdi:water" class="w-3 h-3 mr-1" />
            {{ item.tank_label }}
          </span>
        </div>
        <div
          v-if="item.done && item.done_at"
          class="text-xs text-base-content/60 mt-2 flex items-center gap-1"
        >
          <Icon name="mdi:check-circle" class="w-4 h-4 text-success" />
          Completed {{ formatTime(item.done_at) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  item: {
    type: Object,
    required: true
  }
})

defineEmits(['toggle'])

const { getCategoryColor } = useChecklist()

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago'
  })
}
</script>
