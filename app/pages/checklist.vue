<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-4">Checklists</h1>
      <p class="text-base-content/70">{{ todayDate }}</p>
    </div>

    <PageLoadState
      :loading="loading"
      :error="error"
      :empty="!checklistDay"
      empty-icon="mdi:clipboard-text-clock"
      empty-title="No checklist published for today"
      empty-description="Check back soon or contact your supervisor"
      @retry="retry"
    >
      <div>
        <div class="card bg-base-100 shadow-xl mb-4">
          <div class="card-body p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold">Overall Progress</span>
              <span class="text-sm">{{ overallProgress.done }} / {{ overallProgress.total }}</span>
            </div>
            <progress
              class="progress progress-primary w-full"
              :value="overallProgress.done"
              :max="overallProgress.total"
            ></progress>
            <div class="text-center text-sm text-base-content/70 mt-1">
              {{ overallProgress.percent }}% Complete
            </div>
          </div>
        </div>

        <div v-if="checklistDay.notes" class="alert alert-info mb-4">
          <Icon name="mdi:information" class="w-5 h-5" />
          <span>{{ checklistDay.notes }}</span>
        </div>

        <div class="space-y-4">
          <div
            v-for="block in blocks"
            :key="block"
            v-show="itemsByBlock[block].length > 0"
            class="card bg-base-100 shadow-xl"
          >
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-bold capitalize">{{ formatBlockName(block) }}</h2>
                <div class="badge badge-lg">
                  {{ progressByBlock[block].done }} / {{ progressByBlock[block].total }}
                </div>
              </div>

              <progress
                class="progress progress-primary w-full mb-4"
                :value="progressByBlock[block].done"
                :max="progressByBlock[block].total"
              ></progress>

              <TransitionGroup
                name="checklist-item"
                tag="div"
                class="checklist-item-list flex flex-col gap-3 relative"
                @after-leave="onActiveAfterLeave"
              >
                <div
                  v-for="item in activeByBlock[block]"
                  :key="item.id"
                  :data-item-id="item.id"
                  class="checklist-item-row"
                >
                  <ChecklistItem :item="item" @toggle="handleToggle(item)" />
                </div>
              </TransitionGroup>

              <div
                v-if="visibleDoneByBlock[block].length > 0"
                class="collapse collapse-arrow bg-base-200 rounded-lg mt-3"
              >
                <input type="checkbox" />
                <div class="collapse-title text-base font-medium min-h-0 py-3">
                  Done ({{ visibleDoneByBlock[block].length }})
                </div>
                <div class="collapse-content px-0 relative z-10">
                  <div class="flex flex-col gap-3 pt-1" @click.stop>
                    <ChecklistItem
                      v-for="item in visibleDoneByBlock[block]"
                      :key="item.id"
                      :item="item"
                      @toggle="handleToggle(item)"
                    />
                  </div>
                </div>
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

const {
  checklistDay,
  itemsByBlock,
  progressByBlock,
  overallProgress,
  fetchTodayChecklist,
  toggleItem,
  subscribeToRealtime,
  unsubscribeFromRealtime,
  formatBlockName
} = useChecklist()

const { loading, error, load, retry } = usePageLoad(async () => {
  const { error: fetchError } = await fetchTodayChecklist()
  if (fetchError) throw fetchError
})

const { showError } = useNotifications()

const blocks = ['pre_morning', 'morning', 'midday', 'afternoon', 'evening']
const pendingDoneIds = ref(new Set())
const LEAVE_MS = 350

const todayDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago'
  })
})

const activeByBlock = computed(() => {
  const grouped = {}
  blocks.forEach((block) => {
    grouped[block] = (itemsByBlock.value[block] || []).filter((item) => !item.done)
  })
  return grouped
})

const visibleDoneByBlock = computed(() => {
  const pending = pendingDoneIds.value
  const grouped = {}
  blocks.forEach((block) => {
    grouped[block] = (itemsByBlock.value[block] || []).filter(
      (item) => item.done && !pending.has(item.id)
    )
  })
  return grouped
})

let realtimeChannel = null

const releasePending = (itemId) => {
  if (!itemId || !pendingDoneIds.value.has(itemId)) return
  const next = new Set(pendingDoneIds.value)
  next.delete(itemId)
  pendingDoneIds.value = next
}

const onActiveAfterLeave = (el) => {
  releasePending(el?.dataset?.itemId)
}

const handleToggle = async (item) => {
  const completing = !item.done
  if (completing) {
    const next = new Set(pendingDoneIds.value)
    next.add(item.id)
    pendingDoneIds.value = next
  } else {
    releasePending(item.id)
  }

  const { error: toggleError } = await toggleItem(item.id)
  if (toggleError) {
    releasePending(item.id)
    showError(
      typeof toggleError === 'string'
        ? toggleError
        : (toggleError.message || 'Failed to update item')
    )
    return
  }

  if (completing) {
    window.setTimeout(() => releasePending(item.id), LEAVE_MS + 50)
  }
}

onMounted(async () => {
  await load()

  if (checklistDay.value?.id) {
    realtimeChannel = subscribeToRealtime(checklistDay.value.id)
  }
})

onUnmounted(() => {
  if (realtimeChannel) {
    unsubscribeFromRealtime(realtimeChannel)
  }
})
</script>

<style>
.checklist-item-list {
  min-height: 0;
}

.checklist-item-move {
  transition: transform 350ms ease;
}

.checklist-item-enter-active,
.checklist-item-leave-active {
  transition: opacity 350ms ease, transform 350ms ease;
}

.checklist-item-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 1;
}

.checklist-item-enter-from,
.checklist-item-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

@media (prefers-reduced-motion: reduce) {
  .checklist-item-move {
    transition: none;
  }

  .checklist-item-enter-active,
  .checklist-item-leave-active {
    transition: opacity 350ms ease;
  }

  .checklist-item-enter-from,
  .checklist-item-leave-to {
    opacity: 0;
    transform: none;
  }
}
</style>
