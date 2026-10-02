<template>
  <div class="mb-6">
    <div
      v-if="loading"
      class="rounded-2xl border border-base-300 bg-base-200/70 p-4"
      role="status"
      aria-busy="true"
      aria-label="Loading reminders"
    >
      <div class="flex items-center gap-3 animate-pulse">
        <div class="w-11 h-11 rounded-2xl bg-base-300 shrink-0" />
        <div class="flex-1 space-y-2">
          <div class="h-4 rounded-full bg-base-300 w-4/5" />
          <div class="h-3 rounded-full bg-base-300 w-1/2" />
        </div>
      </div>
    </div>

    <div
      v-else-if="failed"
      class="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 flex items-center gap-3 shadow-sm"
      role="alert"
    >
      <Icon name="mdi:bell-off-outline" class="w-5 h-5 shrink-0 text-base-content/50" />
      <p class="text-sm flex-1 min-w-0">Reminders couldn't load</p>
      <button type="button" class="btn btn-sm btn-ghost shrink-0" @click="retry">
        Retry
      </button>
    </div>

    <NuxtLink
      v-else-if="attentionCount === 0"
      to="/reminders"
      class="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 flex items-center gap-3 shadow-sm active:scale-[0.99] transition-transform"
    >
      <span class="w-9 h-9 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
        <Icon name="mdi:check-circle-outline" class="w-5 h-5" />
      </span>
      <span class="flex-1 min-w-0">
        <span class="block font-semibold leading-tight">You're all caught up</span>
        <span class="block text-sm text-base-content/60 mt-0.5">No open reminders</span>
      </span>
      <Icon name="mdi:chevron-right" class="w-5 h-5 shrink-0 text-base-content/40" />
    </NuxtLink>

    <NuxtLink
      v-else
      to="/reminders"
      class="reminder-attention block rounded-2xl border border-amber-400/80 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-4 shadow-md active:scale-[0.99] transition-transform dark:border-amber-500/50 dark:from-amber-950/50 dark:to-orange-950/30"
    >
      <span class="flex items-start gap-3">
        <span class="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Icon name="mdi:bell-alert" class="w-6 h-6" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-lg font-bold leading-snug text-base-content">
            {{ headline }}
          </span>
          <ul class="mt-3 space-y-2">
            <li
              v-for="item in preview"
              :key="item.id"
              class="flex items-center gap-2 min-w-0"
            >
              <span
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :class="isOverdue(item) ? 'bg-error' : isDueToday(item) ? 'bg-warning' : 'bg-base-content/40'"
              />
              <span class="truncate text-sm font-medium">{{ item.title }}</span>
              <span
                v-if="isOverdue(item)"
                class="badge badge-error badge-sm shrink-0"
              >
                Overdue
              </span>
              <span
                v-else-if="isDueToday(item)"
                class="badge badge-warning badge-sm shrink-0"
              >
                Due today
              </span>
            </li>
          </ul>
          <span class="btn btn-warning btn-sm mt-4 w-full">View reminders</span>
        </span>
      </span>
    </NuxtLink>
  </div>
</template>

<script setup>
const {
  remindersStatus,
  attentionReminders,
  attentionCount,
  isOverdue,
  isDueToday,
  fetchReminders
} = useReminders()

const loading = computed(() => remindersStatus.value === 'idle' || remindersStatus.value === 'loading')
const failed = computed(() => remindersStatus.value === 'error')
const preview = computed(() => attentionReminders.value.slice(0, 3))

const headline = computed(() => {
  const count = attentionCount.value
  const noun = count === 1 ? 'reminder' : 'reminders'
  const verb = count === 1 ? 'needs' : 'need'
  return `${count} important ${noun} ${verb} attention`
})

const retry = () => fetchReminders()
</script>
