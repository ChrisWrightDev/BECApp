<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-4xl font-bold mb-2">Tasks</h1>
        <p class="text-base-content/70">Manage your daily tasks</p>
      </div>
      <div class="flex gap-2">
        <input
          v-model="selectedDate"
          type="date"
          class="input input-bordered"
          @change="handleDateChange"
        />
        <button
          @click="showFilters = !showFilters"
          class="btn btn-outline"
          :class="{ 'btn-active': showFilters }"
        >
          <Icon name="mdi:filter" class="w-5 h-5" />
          Filters
        </button>
        <NuxtLink to="/tasks/calendar" class="btn btn-outline">
          <Icon name="mdi:calendar" class="w-5 h-5" />
          Calendar View
        </NuxtLink>
        <button
          v-if="isAdmin()"
          @click="generateDailyTasksHandler"
          class="btn btn-primary"
          :disabled="generating"
        >
          <Icon name="mdi:refresh" class="w-5 h-5" />
          <span v-if="generating" class="loading loading-spinner loading-sm"></span>
          Generate Tasks
        </button>
      </div>
    </div>

    <!-- Filters Panel -->
    <div v-if="showFilters" class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="flex flex-wrap gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Status</span>
            </label>
            <select
              v-model="filters.status"
              class="select select-bordered"
              @change="applyFilters"
            >
              <option :value="null">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Time Window</span>
            </label>
            <select
              v-model="filters.timeWindow"
              class="select select-bordered"
              @change="applyFilters"
            >
              <option :value="null">All Times</option>
              <option value="morning">Morning</option>
              <option value="midday">Midday</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>

          <div class="form-control flex items-end">
            <button @click="clearFilters" class="btn btn-ghost">
              Clear Filters
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="alert alert-error mb-6">
      <Icon name="mdi:alert-circle" class="w-6 h-6" />
      <span>{{ error }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Tasks List -->
    <div v-else-if="displayTasks.length > 0" class="space-y-6">
      <!-- Group by Time Window -->
      <div
        v-for="(timeWindow, windowName) in groupedTasks"
        :key="windowName"
        class="card bg-base-100 shadow-xl"
      >
        <div class="card-body">
          <h2 class="card-title capitalize mb-4">
            <Icon :name="getTimeWindowIcon(windowName)" class="w-5 h-5" />
            {{ windowName }} Tasks
            <span class="badge badge-primary">{{ timeWindow.length }}</span>
          </h2>
          <div class="divider"></div>
          <div class="space-y-3">
            <div
              v-for="task in timeWindow"
              :key="task.id"
              class="flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
            >
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <input
                    type="checkbox"
                    :checked="task.status === 'completed'"
                    @change="handleStatusChange(task, $event.target.checked)"
                    class="checkbox checkbox-primary"
                  />
                  <div>
                    <div
                      class="font-semibold"
                      :class="{
                        'line-through opacity-60': task.status === 'completed'
                      }"
                    >
                      {{ task.title }}
                    </div>
                    <div class="text-sm text-base-content/70 mt-1">
                      <span class="badge badge-ghost badge-sm">
                        {{ task.project_name }}
                      </span>
                      <span v-if="task.tank_name" class="ml-2">
                        <Icon name="mdi:water" class="w-4 h-4 inline" />
                        <span class="badge badge-info badge-sm">{{ task.tank_name }}</span>
                      </span>
                      <span v-if="task.scheduled_time" class="ml-2">
                        <Icon name="mdi:clock-outline" class="w-4 h-4 inline" />
                        {{ formatTime(task.scheduled_time) }}
                      </span>
                    </div>
                    <div v-if="task.description" class="text-sm text-base-content/60 mt-1">
                      {{ task.description }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="task.project_has_phases && templateHasMultiplePhases(task.project_template_id)"
                  @click="advanceProjectPhase(task)"
                  class="btn btn-primary btn-sm"
                  :disabled="advancingPhase === task.project_id"
                  :title="'Advance to next phase'"
                >
                  <Icon name="mdi:arrow-right" class="w-4 h-4" />
                  <span v-if="advancingPhase !== task.project_id">Next Phase</span>
                  <span v-else class="loading loading-spinner loading-xs"></span>
                </button>
                <button
                  @click="openTaskModal(task)"
                  class="btn btn-ghost btn-sm btn-circle"
                >
                  <Icon name="mdi:information-outline" class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tasks without time window -->
      <div v-if="ungroupedTasks.length > 0" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">
            Other Tasks
            <span class="badge badge-primary">{{ ungroupedTasks.length }}</span>
          </h2>
          <div class="divider"></div>
          <div class="space-y-3">
            <div
              v-for="task in ungroupedTasks"
              :key="task.id"
              class="flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
            >
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <input
                    type="checkbox"
                    :checked="task.status === 'completed'"
                    @change="handleStatusChange(task, $event.target.checked)"
                    class="checkbox checkbox-primary"
                  />
                  <div>
                    <div
                      class="font-semibold"
                      :class="{
                        'line-through opacity-60': task.status === 'completed'
                      }"
                    >
                      {{ task.title }}
                    </div>
                    <div class="text-sm text-base-content/70 mt-1">
                      <span class="badge badge-ghost badge-sm">
                        {{ task.project_name }}
                      </span>
                      <span v-if="task.tank_name" class="ml-2">
                        <Icon name="mdi:water" class="w-4 h-4 inline" />
                        <span class="badge badge-info badge-sm">{{ task.tank_name }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="task.project_has_phases && templateHasMultiplePhases(task.project_template_id)"
                  @click="advanceProjectPhase(task)"
                  class="btn btn-primary btn-sm"
                  :disabled="advancingPhase === task.project_id"
                  :title="'Advance to next phase'"
                >
                  <Icon name="mdi:arrow-right" class="w-4 h-4" />
                  <span v-if="advancingPhase !== task.project_id">Next Phase</span>
                  <span v-else class="loading loading-spinner loading-xs"></span>
                </button>
                <button
                  @click="openTaskModal(task)"
                  class="btn btn-ghost btn-sm btn-circle"
                >
                  <Icon name="mdi:information-outline" class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <Icon name="mdi:check-circle-outline" class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <p class="text-lg text-base-content/70">No tasks found</p>
        <p class="text-sm text-base-content/50 mt-2">
          Try adjusting your filters or select a different date
        </p>
      </div>
    </div>

    <!-- Task Detail Modal -->
    <dialog ref="taskModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">{{ selectedTask?.title }}</h3>
        <div v-if="selectedTask" class="space-y-4">
          <div>
            <label class="label">
              <span class="label-text font-semibold">Project</span>
            </label>
            <p class="text-base-content/70">{{ selectedTask.project_name }}</p>
          </div>
          <div v-if="selectedTask.tank_name">
            <label class="label">
              <span class="label-text font-semibold">Tank</span>
            </label>
            <p class="text-base-content/70">
              <Icon name="mdi:water" class="w-4 h-4 inline" />
              {{ selectedTask.tank_name }}
            </p>
          </div>
          <div v-if="selectedTask.description">
            <label class="label">
              <span class="label-text font-semibold">Description</span>
            </label>
            <p class="text-base-content/70">{{ selectedTask.description }}</p>
          </div>
          <div>
            <label class="label">
              <span class="label-text font-semibold">Due Date</span>
            </label>
            <p class="text-base-content/70">{{ formatDate(selectedTask.due_date) }}</p>
          </div>
          <div v-if="selectedTask.time_window">
            <label class="label">
              <span class="label-text font-semibold">Time Window</span>
            </label>
            <p class="text-base-content/70 capitalize">{{ selectedTask.time_window }}</p>
          </div>
          <div v-if="selectedTask.completion_notes">
            <label class="label">
              <span class="label-text font-semibold">Completion Notes</span>
            </label>
            <p class="text-base-content/70">{{ selectedTask.completion_notes }}</p>
          </div>
        </div>
        <div class="modal-action">
          <form method="dialog">
            <button class="btn">Close</button>
          </form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { isAdmin } = useAuth()
const {
  tasks,
  loading,
  error,
  filters,
  filteredTasks,
  fetchTasks,
  updateTaskStatus,
  setFilters,
  clearFilters: clearTaskFilters,
  generateDailyTasks
} = useTasks()

const {
  updateProject,
  fetchPhases
} = useProjects()

const showFilters = ref(false)
const selectedDate = ref(new Date().toISOString().split('T')[0])
const taskModal = ref(null)
const selectedTask = ref(null)
const generating = ref(false)
const advancingPhase = ref(null)
const supabase = useSupabaseClient()
const { showSuccess, showError } = useNotifications()

// Helper function to check if a task with scheduled_time should be shown
const isTaskWithinTimeWindow = (task) => {
  // If task has no scheduled_time, always show it
  if (!task.scheduled_time) {
    return true
  }
  
  // Check if task is due today (based on selected date or current date)
  const today = selectedDate.value || new Date().toISOString().split('T')[0]
  if (task.due_date !== today) {
    // If task is not due today, don't show it (unless it has no scheduled_time, which we already handled)
    return false
  }
  
  // If task is not completed and scheduled time has passed, always show it (remove time constraint)
  const isCompleted = task.status === 'completed'
  if (!isCompleted) {
    // Get current time
    const now = new Date()
    const currentHours = now.getHours()
    const currentMinutes = now.getMinutes()
    const currentTimeInMinutes = currentHours * 60 + currentMinutes
    
    // Parse scheduled_time (format: "HH:MM:SS" or "HH:MM")
    const timeParts = task.scheduled_time.split(':')
    const scheduledHours = parseInt(timeParts[0], 10)
    const scheduledMinutes = parseInt(timeParts[1], 10)
    const scheduledTimeInMinutes = scheduledHours * 60 + scheduledMinutes
    
    // Check if scheduled time has passed
    const scheduledTimeHasPassed = currentTimeInMinutes > scheduledTimeInMinutes
    
    // If scheduled time has passed and task is not completed, always show it
    if (scheduledTimeHasPassed) {
      return true
    }
  }
  
  // For completed tasks or tasks where scheduled time hasn't passed yet,
  // apply the 1-hour window filter
  const now = new Date()
  const currentHours = now.getHours()
  const currentMinutes = now.getMinutes()
  const currentTimeInMinutes = currentHours * 60 + currentMinutes
  
  // Parse scheduled_time (format: "HH:MM:SS" or "HH:MM")
  const timeParts = task.scheduled_time.split(':')
  const scheduledHours = parseInt(timeParts[0], 10)
  const scheduledMinutes = parseInt(timeParts[1], 10)
  const scheduledTimeInMinutes = scheduledHours * 60 + scheduledMinutes
  
  // Calculate time difference in minutes
  let timeDiff = Math.abs(currentTimeInMinutes - scheduledTimeInMinutes)
  
  // Handle case where scheduled time might be on the next day (e.g., 23:30 vs 00:30)
  // or previous day (e.g., 00:30 vs 23:30)
  if (timeDiff > 12 * 60) { // More than 12 hours difference, likely cross-day
    timeDiff = 24 * 60 - timeDiff // Wrap around
  }
  
  // Show task if within 1 hour (60 minutes) of scheduled time
  return timeDiff <= 60
}

// Computed
const displayTasks = computed(() => {
  let tasksToDisplay = []
  
  if (filters.value.status || filters.value.timeWindow || filters.value.date) {
    tasksToDisplay = filteredTasks.value
  } else {
    tasksToDisplay = tasks.value
  }
  
  // Filter out completed tasks
  tasksToDisplay = tasksToDisplay.filter(task => task.status !== 'completed')
  
  // Filter tasks with scheduled_time to only show within 1 hour window
  return tasksToDisplay.filter(task => isTaskWithinTimeWindow(task))
})

const groupedTasks = computed(() => {
  const grouped = {
    morning: [],
    midday: [],
    afternoon: [],
    evening: []
  }
  
  displayTasks.value.forEach(task => {
    if (task.time_window && grouped[task.time_window]) {
      grouped[task.time_window].push(task)
    }
  })
  
  // Remove empty groups
  Object.keys(grouped).forEach(key => {
    if (grouped[key].length === 0) {
      delete grouped[key]
    }
  })
  
  return grouped
})

const ungroupedTasks = computed(() => {
  return displayTasks.value.filter(task => !task.time_window)
})

// Methods
const handleDateChange = () => {
  setFilters({ date: selectedDate.value })
  loadTasks()
}

const applyFilters = () => {
  loadTasks()
}

const clearFilters = () => {
  clearTaskFilters()
  selectedDate.value = new Date().toISOString().split('T')[0]
  loadTasks()
}

const loadTasks = async () => {
  const options = {}
  if (filters.value.status) options.status = filters.value.status
  if (filters.value.timeWindow) options.timeWindow = filters.value.timeWindow
  if (filters.value.date) options.date = filters.value.date
  
  await fetchTasks(options)
}

const handleStatusChange = async (task, isCompleted) => {
  const newStatus = isCompleted ? 'completed' : 'pending'
  await updateTaskStatus(task.id, newStatus)
}

const handleStatusSelect = async (taskId, status) => {
  await updateTaskStatus(taskId, status)
}

const openTaskModal = (task) => {
  selectedTask.value = task
  taskModal.value?.showModal()
}

const getTimeWindowIcon = (window) => {
  const icons = {
    morning: 'mdi:weather-sunny',
    midday: 'mdi:weather-sunset-up',
    afternoon: 'mdi:weather-sunset',
    evening: 'mdi:weather-night'
  }
  return icons[window] || 'mdi:clock-outline'
}

const getStatusSelectClass = (status) => {
  const classes = {
    pending: 'select-warning',
    in_progress: 'select-info',
    completed: 'select-success',
    skipped: 'select-ghost',
    cancelled: 'select-error'
  }
  return classes[status] || ''
}

const formatTime = (time) => {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Cache for template phase counts (template_id -> phase count)
const templatePhaseCountCache = ref(new Map())

// Helper function to check if template has more than 1 phase
const hasMultiplePhases = async (templateId) => {
  if (!templateId) return false
  
  // Check cache first
  if (templatePhaseCountCache.value.has(templateId)) {
    return templatePhaseCountCache.value.get(templateId) > 1
  }
  
  try {
    // Get total phase count for the template
    const { count: totalPhases } = await supabase
      .from('phases')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', templateId)
    
    const phaseCount = totalPhases || 0
    templatePhaseCountCache.value.set(templateId, phaseCount)
    return phaseCount > 1
  } catch (err) {
    console.error('Error checking phase count:', err)
    return false
  }
}

// Check phase counts for all unique templates in displayed tasks
const checkTemplatePhaseCounts = async () => {
  const uniqueTemplateIds = [...new Set(displayTasks.value
    .filter(task => task.project_template_id)
    .map(task => task.project_template_id))]
  
  for (const templateId of uniqueTemplateIds) {
    if (!templatePhaseCountCache.value.has(templateId)) {
      await hasMultiplePhases(templateId)
    }
  }
}

// Helper function for template to check if template has multiple phases
const templateHasMultiplePhases = (templateId) => {
  if (!templateId) return false
  return (templatePhaseCountCache.value.get(templateId) || 0) > 1
}

const advanceProjectPhase = async (task) => {
  if (!task.project_id || !task.project_template_id || !task.project_current_phase_id) {
    showError('Cannot advance phase: Project information missing')
    return
  }

  advancingPhase.value = task.project_id
  try {
    // Get current phase order
    const currentPhaseOrder = task.project_current_phase_order
    
    // Get next phase
    const { data: nextPhase, error: phaseError } = await supabase
      .from('phases')
      .select('id, name, order_index')
      .eq('template_id', task.project_template_id)
      .gt('order_index', currentPhaseOrder)
      .order('order_index', { ascending: true })
      .limit(1)
      .single()

    if (phaseError || !nextPhase) {
      // No next phase - project might be complete
      const result = await updateProject(task.project_id, { 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      if (result.error) {
        throw result.error
      }
      showSuccess('Project completed - no more phases')
    } else {
      // Advance to next phase
      const result = await updateProject(task.project_id, { 
        current_phase_id: nextPhase.id 
      })
      if (result.error) {
        throw result.error
      }
      showSuccess(`Project advanced to phase: ${nextPhase.name}`)
    }
    
    // Clear cache and reload tasks to reflect updated project info
    templatePhaseCountCache.value.clear()
    await loadTasks()
    await checkTemplatePhaseCounts()
  } catch (err) {
    console.error('Error advancing phase:', err)
    showError('Error advancing phase: ' + (err.message || 'Unknown error'))
  } finally {
    advancingPhase.value = null
  }
}

const generateDailyTasksHandler = async () => {
  generating.value = true
  try {
    const { data, error: genError } = await generateDailyTasks()
    if (genError) {
      showError('Error generating tasks: ' + genError.message)
    } else {
      showSuccess(`Successfully generated ${data?.length || 0} tasks`)
      await loadTasks()
    }
  } catch (err) {
    console.error('Error generating tasks:', err)
    showError('Error generating tasks')
  } finally {
    generating.value = false
  }
}

// Watch displayTasks to update phase counts
watch(displayTasks, async () => {
  await checkTemplatePhaseCounts()
}, { deep: true })

// Initialize
onMounted(async () => {
  setFilters({ date: selectedDate.value })
  await loadTasks()
  await checkTemplatePhaseCounts()
})
</script>

