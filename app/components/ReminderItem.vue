<template>
  <div
    class="border-2 rounded-lg p-3 cursor-pointer select-none"
    :class="itemClasses"
    role="checkbox"
    :aria-checked="isDone"
    :aria-label="item.title"
    tabindex="0"
    @click="$emit('toggle')"
    @keydown.enter.prevent="$emit('toggle')"
    @keydown.space.prevent="$emit('toggle')"
  >
    <div class="flex items-start gap-3">
      <input
        type="checkbox"
        :checked="isDone"
        class="checkbox checkbox-primary checkbox-lg mt-1 flex-shrink-0 pointer-events-none"
        :class="{ 'checkbox-success': isDone }"
        tabindex="-1"
        aria-hidden="true"
      />
      <div class="flex-1 min-w-0">
        <div
          class="font-semibold text-base break-words"
          :class="{ 'line-through opacity-60': isDone }"
        >
          {{ item.title }}
        </div>
        <div v-if="item.details" class="text-sm text-base-content/70 mt-1 break-words">
          {{ item.details }}
        </div>
        <div class="flex flex-wrap gap-2 mt-2">
          <span
            v-if="item.due_date"
            class="badge badge-sm"
            :class="overdue ? 'badge-error' : 'badge-ghost'"
          >
            <Icon name="mdi:calendar" class="w-3 h-3 mr-1" />
            {{ overdue ? 'Overdue · ' : '' }}{{ formatDue(item.due_date) }}
          </span>
          <span class="badge badge-sm badge-ghost">
            <Icon name="mdi:account" class="w-3 h-3 mr-1" />
            {{ staffName(item.assigned_to) }}
          </span>
          <NuxtLink
            v-if="item.source_message_id"
            :to="`/chat?message=${item.source_message_id}`"
            class="badge badge-sm badge-outline"
            @click.stop
          >
            <Icon name="mdi:message-text-outline" class="w-3 h-3 mr-1" />
            From chat
          </NuxtLink>
        </div>
        <div
          v-if="isDone && item.completed_at"
          class="text-xs text-base-content/60 mt-2 flex items-center gap-1"
        >
          <Icon name="mdi:check-circle" class="w-4 h-4 text-success" />
          Completed {{ formatTime(item.completed_at) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

defineEmits(['toggle'])

const { isOverdue, staffName } = useReminders()

const isDone = computed(() => Boolean(props.item.completed_at))
const overdue = computed(() => isOverdue(props.item))

const itemClasses = computed(() => {
  if (isDone.value) return 'border-success bg-success/5'
  if (overdue.value) return 'border-error bg-error/5'
  return 'border-base-300 bg-base-200'
})

const formatDue = (dateString) => {
  if (!dateString) return ''
  const [year, month, day] = String(dateString).split('-').map(Number)
  if (!year || !month || !day) return dateString
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

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
