<template>
  <div>
    <div class="page-header">
      <h1>Checklists</h1>
      <p>{{ todayDate }}</p>
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
    <!-- Checklist Content -->
    <div>
      <!-- Overall Progress -->
      <div class="card bg-base-100 shadow-md mb-4">
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

      <!-- Day Notes (if any) -->
      <div v-if="checklistDay.notes" class="alert alert-info mb-4">
        <Icon name="mdi:information" class="w-5 h-5" />
        <span>{{ checklistDay.notes }}</span>
      </div>

      <!-- Checklist Blocks -->
      <div class="space-y-4">
        <div 
          v-for="block in blocks" 
          :key="block"
          v-show="itemsByBlock[block].length > 0"
          class="card bg-base-100 shadow-md"
        >
          <div class="card-body p-4">
            <!-- Block Header -->
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-lg font-bold capitalize">{{ formatBlockName(block) }}</h2>
              <div class="badge badge-lg">
                {{ progressByBlock[block].done }} / {{ progressByBlock[block].total }}
              </div>
            </div>

            <!-- Block Progress -->
            <progress 
              class="progress progress-primary w-full mb-4" 
              :value="progressByBlock[block].done" 
              :max="progressByBlock[block].total"
            ></progress>

            <!-- Items in Block -->
            <div class="space-y-3">
              <div
                v-for="item in itemsByBlock[block]"
                :key="item.id"
                class="border-2 rounded-lg p-3 transition-all"
                :class="{
                  'border-success bg-success/5': item.done,
                  'border-base-300 bg-base-200': !item.done
                }"
              >
                <!-- Item Header (Title + Checkbox) -->
                <div class="flex items-start gap-3 mb-2">
                  <input
                    type="checkbox"
                    :checked="item.done"
                    @change="handleToggle(item)"
                    :disabled="item.requires_value && !item.value_text && !item.done"
                    class="checkbox checkbox-primary checkbox-lg mt-1 flex-shrink-0"
                    :class="{ 'checkbox-success': item.done }"
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
                  </div>
                </div>

                <!-- Badges (Category, Tank, etc.) -->
                <div class="flex flex-wrap gap-2 mb-2">
                  <span :class="['badge badge-sm', getCategoryColor(item.category)]">
                    {{ item.category.replace('_', ' ') }}
                  </span>
                  <span v-if="item.tank_label" class="badge badge-sm badge-info">
                    <Icon name="mdi:water" class="w-3 h-3 mr-1" />
                    {{ item.tank_label }}
                  </span>
                  <span v-if="item.requires_value" class="badge badge-sm badge-warning">
                    <Icon name="mdi:pencil" class="w-3 h-3 mr-1" />
                    Value Required
                  </span>
                </div>

                <!-- Value Input (for requires_value items) -->
                <div v-if="item.requires_value" class="mb-2">
                  <label class="label py-1">
                    <span class="label-text text-sm font-semibold">
                      {{ item.category === 'temp_check' ? 'Temperature (°F)' : 'Value' }}
                    </span>
                  </label>
                  <input
                    type="text"
                    v-model="item.value_text"
                    @blur="handleValueUpdate(item)"
                    :disabled="item.done"
                    placeholder="Enter value..."
                    class="input input-bordered input-sm w-full"
                  />
                </div>

                <!-- Note Section -->
                <div class="collapse collapse-arrow bg-base-300 rounded-lg">
                  <input type="checkbox" :id="`note-${item.id}`" />
                  <label :for="`note-${item.id}`" class="collapse-title text-sm font-medium py-2 px-3 min-h-0 cursor-pointer">
                    <Icon name="mdi:note-text" class="w-4 h-4 inline mr-1" />
                    {{ item.note ? 'View/Edit Note' : 'Add Note' }}
                  </label>
                  <div class="collapse-content px-3">
                    <textarea
                      v-model="item.note"
                      @blur="handleNoteUpdate(item)"
                      placeholder="Add a note about this task..."
                      class="textarea textarea-bordered textarea-sm w-full mt-2"
                      rows="2"
                    ></textarea>
                  </div>
                </div>

                <!-- Completion Info -->
                <div v-if="item.done && item.done_at" class="text-xs text-base-content/60 mt-2 flex items-center gap-1">
                  <Icon name="mdi:check-circle" class="w-4 h-4 text-success" />
                  Completed {{ formatTime(item.done_at) }}
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
  checklistItems,
  itemsByBlock,
  progressByBlock,
  overallProgress,
  fetchTodayChecklist,
  toggleItem,
  updateItemValue,
  updateItemNote,
  subscribeToRealtime,
  unsubscribeFromRealtime,
  formatBlockName,
  getCategoryColor
} = useChecklist()

const { loading, error, load, retry } = usePageLoad(async () => {
  const { error: fetchError } = await fetchTodayChecklist()
  if (fetchError) throw fetchError
})

const { showSuccess, showError } = useNotifications()

const blocks = ['pre_morning', 'morning', 'midday', 'afternoon', 'evening']

const todayDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago'
  })
})

let realtimeChannel = null

// Handle item toggle
const handleToggle = async (item) => {
  const { error: toggleError } = await toggleItem(item.id)
  if (toggleError) {
    showError(toggleError.message || 'Failed to update item')
  } else {
    if (item.done) {
      showSuccess('Task completed!')
    }
  }
}

// Handle value update (blur event)
const handleValueUpdate = async (item) => {
  const { error: updateError } = await updateItemValue(item.id, item.value_text)
  if (updateError) {
    showError('Failed to update value')
  }
}

// Handle note update (blur event)
const handleNoteUpdate = async (item) => {
  const { error: updateError } = await updateItemNote(item.id, item.note)
  if (updateError) {
    showError('Failed to update note')
  }
}

// Format timestamp
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago'
  })
}

// Initialize
onMounted(async () => {
  await load()

  // Subscribe to realtime updates if we have a checklist day
  if (checklistDay.value?.id) {
    realtimeChannel = subscribeToRealtime(checklistDay.value.id)
  }
})

// Cleanup
onUnmounted(() => {
  if (realtimeChannel) {
    unsubscribeFromRealtime(realtimeChannel)
  }
})
</script>
