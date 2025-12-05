<template>
  <div>
    <div class="mb-4 sm:mb-8">
      <h1 class="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2">Tasks</h1>
      <p class="text-sm sm:text-base text-base-content/70">Manage your daily tasks</p>
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
    <div v-else-if="orderedTasks.length > 0" class="space-y-4 sm:space-y-6">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-4 sm:p-6">
          <h2 class="card-title mb-3 sm:mb-4 text-lg sm:text-xl">
            Tasks
            <span class="badge badge-primary badge-sm sm:badge-md">{{ orderedTasks.length }}</span>
          </h2>
          <div class="divider"></div>
          <div class="space-y-2 sm:space-y-3">
            <div
              v-for="task in orderedTasks"
              :key="task.id"
              class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-start gap-2 sm:gap-3">
                  <input
                    type="checkbox"
                    :checked="task.status === 'completed'"
                    @change="handleStatusChange(task, $event.target.checked)"
                    :disabled="isTaskDisabled(task)"
                    class="checkbox checkbox-primary checkbox-sm sm:checkbox-md mt-1 flex-shrink-0"
                    :title="isTaskDisabled(task) ? 'Complete previous tasks first' : ''"
                  />
                  <div class="flex-1 min-w-0">
                    <div
                      class="font-semibold text-sm sm:text-base break-words"
                      :class="{
                        'line-through opacity-60': task.status === 'completed'
                      }"
                    >
                      {{ task.title }}
                    </div>
                    <div class="text-xs sm:text-sm text-base-content/70 mt-1 flex flex-wrap gap-1 sm:gap-2">
                      <span v-if="task.project_name" class="badge badge-ghost badge-xs sm:badge-sm">
                        {{ task.project_name }}
                      </span>
                      <span v-if="task.job_name" class="badge badge-primary badge-xs sm:badge-sm">
                        <Icon name="mdi:briefcase" class="w-3 h-3 sm:w-4 sm:h-4 inline" />
                        {{ task.job_name }}
                      </span>
                      <span v-if="task.tank_name" class="badge badge-info badge-xs sm:badge-sm">
                        <Icon name="mdi:water" class="w-3 h-3 sm:w-4 sm:h-4 inline" />
                        {{ task.tank_name }}
                      </span>
                      <span v-if="task.scheduled_time" class="badge badge-ghost badge-xs sm:badge-sm">
                        <Icon name="mdi:clock-outline" class="w-3 h-3 sm:w-4 sm:h-4 inline" />
                        {{ formatTime(task.scheduled_time) }}
                      </span>
                      <span v-if="task.time_window" class="badge badge-outline badge-xs sm:badge-sm capitalize">
                        <Icon :name="getTimeWindowIcon(task.time_window)" class="w-3 h-3 sm:w-4 sm:h-4 inline" />
                        {{ task.time_window }}
                      </span>
                    </div>
                    <div v-if="task.description" class="text-xs sm:text-sm text-base-content/60 mt-1 break-words">
                      {{ task.description }}
                    </div>
                    <!-- Show collapsed indicator -->
                    <div v-if="task._sequentialGroupKey && task._groupSize && !isSequentialGroupExpanded(task._sequentialGroupKey)" class="text-xs text-base-content/50 mt-1 italic">
                      {{ task._groupSize - 1 }} more task{{ task._groupSize - 1 !== 1 ? 's' : '' }} in sequence
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 sm:flex-shrink-0">
                <div class="flex items-center gap-2">
                <!-- Collapse/Expand button for sequential groups -->
                <button
                  v-if="task._sequentialGroupKey"
                  @click="toggleSequentialGroup(task._sequentialGroupKey)"
                  class="btn btn-ghost btn-xs sm:btn-sm btn-circle"
                  :title="isSequentialGroupExpanded(task._sequentialGroupKey) ? 'Collapse tasks' : 'Expand tasks'"
                >
                  <Icon 
                    :name="isSequentialGroupExpanded(task._sequentialGroupKey) ? 'mdi:chevron-up' : 'mdi:chevron-down'" 
                    class="w-4 h-4 sm:w-5 sm:h-5" 
                  />
                </button>
                <button
                  v-if="shouldShowNextPhaseButton(task)"
                  @click="advanceProjectPhase(task)"
                  class="btn btn-primary btn-xs sm:btn-sm flex-1 sm:flex-none"
                  :disabled="advancingPhase === task.project_id"
                  :title="'Advance to next phase'"
                >
                  <Icon name="mdi:arrow-right" class="w-3 h-3 sm:w-4 sm:h-4" />
                  <span v-if="advancingPhase !== task.project_id" class="hidden sm:inline">Next Phase</span>
                  <span v-else class="loading loading-spinner loading-xs"></span>
                </button>
                <button
                  @click="openTaskModal(task)"
                  class="btn btn-ghost btn-xs sm:btn-sm btn-circle"
                  :title="'View details'"
                >
                  <Icon name="mdi:information-outline" class="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
                <div
                  v-if="shouldShowNextPhaseButton(task) && getNextPhaseDescription(task)"
                  class="text-xs text-base-content/60 text-right max-w-[150px] sm:max-w-[200px]"
                >
                  {{ getNextPhaseDescription(task) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="orderedTasks.length === 0" class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <Icon name="mdi:check-circle-outline" class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <p class="text-lg text-base-content/70">No tasks found</p>
        <p class="text-sm text-base-content/50 mt-2">
          Try adjusting your filters or select a different date
        </p>
      </div>
    </div>

    <!-- Logout Prompt Modal -->
    <dialog ref="logoutPromptModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Close Up Shop Complete</h3>
        <p class="mb-4">
          You've completed the "Close Up Shop" task. Would you like to log out now?
        </p>
        <div class="modal-action">
          <button @click="closeLogoutPrompt" class="btn btn-ghost">Stay Logged In</button>
          <button @click="handleLogout" class="btn btn-primary">Log Out</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeLogoutPrompt">close</button>
      </form>
    </dialog>

    <!-- Task Detail Modal -->
    <dialog ref="taskModal" class="modal">
      <div class="modal-box w-11/12 max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 class="font-bold text-base sm:text-lg mb-3 sm:mb-4 break-words">{{ selectedTask?.title }}</h3>
        <div v-if="selectedTask" class="space-y-3 sm:space-y-4">
          <div v-if="selectedTask.project_name">
            <label class="label py-1 sm:py-2">
              <span class="label-text font-semibold text-sm sm:text-base">Project</span>
            </label>
            <p class="text-sm sm:text-base text-base-content/70 break-words">{{ selectedTask.project_name }}</p>
          </div>
          <div v-if="selectedTask.job_name">
            <label class="label py-1 sm:py-2">
              <span class="label-text font-semibold text-sm sm:text-base">Job</span>
            </label>
            <p class="text-sm sm:text-base text-base-content/70 break-words">
              <Icon name="mdi:briefcase" class="w-4 h-4 inline" />
              {{ selectedTask.job_name }}
            </p>
          </div>
          <div v-if="selectedTask.tank_name">
            <label class="label py-1 sm:py-2">
              <span class="label-text font-semibold text-sm sm:text-base">Tank</span>
            </label>
            <p class="text-sm sm:text-base text-base-content/70">
              <Icon name="mdi:water" class="w-4 h-4 inline" />
              {{ selectedTask.tank_name }}
            </p>
          </div>
          <div v-if="selectedTask.description">
            <label class="label py-1 sm:py-2">
              <span class="label-text font-semibold text-sm sm:text-base">Description</span>
            </label>
            <p class="text-sm sm:text-base text-base-content/70 break-words">{{ selectedTask.description }}</p>
          </div>
          <div>
            <label class="label py-1 sm:py-2">
              <span class="label-text font-semibold text-sm sm:text-base">Due Date</span>
            </label>
            <p class="text-sm sm:text-base text-base-content/70">{{ formatDate(selectedTask.due_date) }}</p>
          </div>
          <div v-if="selectedTask.time_window">
            <label class="label py-1 sm:py-2">
              <span class="label-text font-semibold text-sm sm:text-base">Time Window</span>
            </label>
            <p class="text-sm sm:text-base text-base-content/70 capitalize">{{ selectedTask.time_window }}</p>
          </div>
          <div v-if="selectedTask.completion_notes">
            <label class="label py-1 sm:py-2">
              <span class="label-text font-semibold text-sm sm:text-base">Completion Notes</span>
            </label>
            <p class="text-sm sm:text-base text-base-content/70 break-words">{{ selectedTask.completion_notes }}</p>
          </div>
        </div>
        <div class="modal-action mt-4 sm:mt-6">
          <form method="dialog">
            <button class="btn btn-sm sm:btn-md w-full sm:w-auto">Close</button>
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
  generateDailyTasks,
  generateTasksFromPhase
} = useTasks()

const {
  updateProject,
  fetchPhases
} = useProjects()

const taskModal = ref(null)
const logoutPromptModal = ref(null)
const selectedTask = ref(null)
const generating = ref(false)
const advancingPhase = ref(null)
const supabase = useSupabaseClient()
const { showSuccess, showError } = useNotifications()
const { signOut } = useAuth()
const router = useRouter()

// Cache for next phase descriptions (task_id -> description)
const nextPhaseDescriptionCache = ref(new Map())

// Track expanded sequential groups (key: "phase-{project_id}-{phase_id}" or "job-{job_id}")
const expandedSequentialGroups = ref(new Set())

// Helper function to check if a task with scheduled_time is within 1 hour of its start time
// Returns true if within 1 hour before, or if the time has passed (always show after time)
const isTaskWithinTimeWindow = (task) => {
  // If task has no scheduled_time, always show it
  if (!task.scheduled_time) {
    return true
  }
  
  // Check if task is due today
  const today = new Date().toISOString().split('T')[0]
  if (task.due_date !== today) {
    return false
  }
  
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
  
  // If scheduled time has passed, always show it (don't filter out)
  if (currentTimeInMinutes >= scheduledTimeInMinutes) {
    return true
  }
  
  // Calculate time difference in minutes (before scheduled time)
  const timeDiff = scheduledTimeInMinutes - currentTimeInMinutes
  
  // Show task if within 1 hour (60 minutes) before scheduled time
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
  
  return tasksToDisplay
})

// Get group key for a sequential task
// Includes due_date to separate tasks from same phase/job on different days
const getSequentialGroupKey = (task) => {
  if (task.phase_requires_sequential && task.project_id && task.project_current_phase_id && task.due_date) {
    return `phase-${task.project_id}-${task.project_current_phase_id}-${task.due_date}`
  }
  if (task.job_requires_sequential && task.job_id && task.due_date) {
    return `job-${task.job_id}-${task.due_date}`
  }
  return null
}

// Get the active task (first incomplete) in a sequential group
const getActiveTaskInGroup = (groupTasks) => {
  // Sort by order_index
  const sorted = [...groupTasks].sort((a, b) => {
    const orderA = a.phase_task_order_index ?? a.job_task_order_index ?? 0
    const orderB = b.phase_task_order_index ?? b.job_task_order_index ?? 0
    return orderA - orderB
  })
  
  // Find first incomplete task
  const activeTask = sorted.find(t => t.status !== 'completed')
  return activeTask || sorted[sorted.length - 1] // If all completed, return last one
}

// Ordered tasks: First -> Timed (within 1 hour or past) -> No time -> Last
// With sequential groups collapsed
const orderedTasks = computed(() => {
  const tasks = [...displayTasks.value]
  
  // Separate tasks into categories
  const firstTasks = tasks.filter(task => task.time_window === 'first')
  const timedTasks = tasks.filter(task => 
    task.scheduled_time && 
    isTaskWithinTimeWindow(task) &&
    task.time_window !== 'first' &&
    task.time_window !== 'last'
  )
  const noTimeTasks = tasks.filter(task => 
    !task.scheduled_time && 
    task.time_window !== 'first' && 
    task.time_window !== 'last'
  )
  const lastTasks = tasks.filter(task => task.time_window === 'last')
  
  // Sort timed tasks by scheduled time
  timedTasks.sort((a, b) => {
    if (!a.scheduled_time || !b.scheduled_time) return 0
    const timeA = a.scheduled_time.split(':').map(Number)
    const timeB = b.scheduled_time.split(':').map(Number)
    const minutesA = timeA[0] * 60 + timeA[1]
    const minutesB = timeB[0] * 60 + timeB[1]
    return minutesA - minutesB
  })
  
  // Combine in order: First -> Timed -> No Time -> Last
  const allTasks = [...firstTasks, ...timedTasks, ...noTimeTasks, ...lastTasks]
  
  // Group sequential tasks to find active tasks
  const sequentialGroups = new Map()
  const seenGroups = new Set()
  
  allTasks.forEach(task => {
    const groupKey = getSequentialGroupKey(task)
    if (groupKey) {
      if (!sequentialGroups.has(groupKey)) {
        sequentialGroups.set(groupKey, [])
      }
      sequentialGroups.get(groupKey).push(task)
    }
  })
  
  // Process tasks: show only active task from sequential groups unless expanded
  const processedTasks = allTasks.map(task => {
    const groupKey = getSequentialGroupKey(task)
    
    if (!groupKey) {
      // Non-sequential task - always show
      return task
    }
    
    const groupTasks = sequentialGroups.get(groupKey)
    const isExpanded = expandedSequentialGroups.value.has(groupKey)
    const activeTask = getActiveTaskInGroup(groupTasks)
    
    if (isExpanded) {
      // Show all tasks in the group, mark which is active
      return {
        ...task,
        _sequentialGroupKey: groupKey,
        _isActiveTask: task.id === activeTask.id
      }
    } else {
      // Show only if this is the active task
      if (task.id === activeTask.id) {
        return {
          ...task,
          _sequentialGroupKey: groupKey,
          _isActiveTask: true,
          _groupSize: groupTasks.length
        }
      } else {
        // Hide this task
        return null
      }
    }
  }).filter(task => task !== null)
  
  return processedTasks
})

// Check if a task should be disabled due to sequential requirements
const isTaskDisabled = (task) => {
  // If task is already completed, don't disable it
  if (task.status === 'completed') {
    return false
  }
  
  // Check for phase-based sequential requirements
  if (task.phase_requires_sequential && task.phase_task_order_index !== null && task.phase_task_order_index !== undefined) {
    // Find all tasks from the same phase/project
    const samePhaseTasks = orderedTasks.value.filter(t => 
      t.project_id === task.project_id &&
      t.project_current_phase_id === task.project_current_phase_id &&
      t.phase_task_order_index !== null &&
      t.phase_task_order_index !== undefined
    )
    
    // Check if any previous task (lower order_index) is not completed
    for (const t of samePhaseTasks) {
      if (t.phase_task_order_index < task.phase_task_order_index && t.status !== 'completed') {
        return true
      }
    }
  }
  
  // Check for job-based sequential requirements
  if (task.job_requires_sequential && task.job_task_order_index !== null && task.job_task_order_index !== undefined) {
    // Find all tasks from the same job
    const sameJobTasks = orderedTasks.value.filter(t => 
      t.job_id === task.job_id &&
      t.job_task_order_index !== null &&
      t.job_task_order_index !== undefined
    )
    
    // Check if any previous task (lower order_index) is not completed
    for (const t of sameJobTasks) {
      if (t.job_task_order_index < task.job_task_order_index && t.status !== 'completed') {
        return true
      }
    }
  }
  
  return false
}

// Methods
const loadTasks = async () => {
  const options = {}
  if (filters.value.status) options.status = filters.value.status
  if (filters.value.timeWindow) options.timeWindow = filters.value.timeWindow
  if (filters.value.date) options.date = filters.value.date
  
  await fetchTasks(options)
}

const handleStatusChange = async (task, isCompleted) => {
  // Prevent completing tasks out of order
  if (isCompleted && isTaskDisabled(task)) {
    showError('Please complete previous tasks first')
    return
  }
  
  const newStatus = isCompleted ? 'completed' : 'pending'
  await updateTaskStatus(task.id, newStatus)
  
  // Check if this is a "Close Up Shop" task and it was just completed
  if (isCompleted && task.job_name) {
    const jobNameLower = task.job_name.toLowerCase()
    const closeShopKeywords = ['close shop', 'close up shop', 'close', 'end', 'shutdown']
    const isCloseShopTask = closeShopKeywords.some(keyword => jobNameLower.includes(keyword))
    
    if (isCloseShopTask) {
      // Prompt user to log out
      showLogoutPrompt()
    }
  }
}

const handleStatusSelect = async (taskId, status) => {
  await updateTaskStatus(taskId, status)
}

const openTaskModal = (task) => {
  selectedTask.value = task
  taskModal.value?.showModal()
}

const showLogoutPrompt = () => {
  logoutPromptModal.value?.showModal()
}

const closeLogoutPrompt = () => {
  logoutPromptModal.value?.close()
}

const handleLogout = async () => {
  closeLogoutPrompt()
  const { error } = await signOut()
  if (error) {
    showError('Error logging out: ' + error.message)
  } else {
    await router.push('/auth/login')
  }
}

// Toggle sequential group expansion
const toggleSequentialGroup = (groupKey) => {
  // Create a new Set to ensure reactivity
  const newSet = new Set(expandedSequentialGroups.value)
  if (newSet.has(groupKey)) {
    newSet.delete(groupKey)
  } else {
    newSet.add(groupKey)
  }
  expandedSequentialGroups.value = newSet
}

// Check if sequential group is expanded
const isSequentialGroupExpanded = (groupKey) => {
  return expandedSequentialGroups.value.has(groupKey)
}

const getTimeWindowIcon = (window) => {
  const icons = {
    first: 'mdi:arrow-up-bold',
    morning: 'mdi:weather-sunny',
    midday: 'mdi:weather-sunset-up',
    afternoon: 'mdi:weather-sunset',
    evening: 'mdi:weather-night',
    last: 'mdi:arrow-down-bold'
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

// Check if Next Phase button should be shown for this task
const shouldShowNextPhaseButton = (task) => {
  // Basic check: must have phases and multiple phases in template
  if (!task.project_has_phases || !templateHasMultiplePhases(task.project_template_id)) {
    return false
  }
  
  // If phase doesn't require sequential completion, show button on all tasks
  if (!task.phase_requires_sequential) {
    return true
  }
  
  // If sequential is required, only show on the last task (highest order_index)
  if (task.phase_requires_sequential && task.phase_task_order_index !== null && task.phase_task_order_index !== undefined) {
    // Find all tasks from the same phase/project
    const samePhaseTasks = orderedTasks.value.filter(t => 
      t.project_id === task.project_id &&
      t.project_current_phase_id === task.project_current_phase_id &&
      t.phase_task_order_index !== null &&
      t.phase_task_order_index !== undefined
    )
    
    if (samePhaseTasks.length === 0) {
      return true // No other tasks, show button
    }
    
    // Find the maximum order_index
    const maxOrderIndex = Math.max(...samePhaseTasks.map(t => t.phase_task_order_index))
    
    // Only show if this task has the maximum order_index
    return task.phase_task_order_index === maxOrderIndex
  }
  
  return true
}

// Get next phase description for a task
const getNextPhaseDescription = (task) => {
  if (!task.project_id || !task.project_template_id || !task.project_current_phase_id) {
    return null
  }
  
  // Create a unique key for this task's next phase
  const cacheKey = `${task.project_id}-${task.project_current_phase_id}`
  return nextPhaseDescriptionCache.value.get(cacheKey) || null
}

// Fetch next phase description for a task
const fetchNextPhaseDescription = async (task) => {
  if (!task.project_id || !task.project_template_id || !task.project_current_phase_id || !task.project_current_phase_order) {
    return
  }
  
  const cacheKey = `${task.project_id}-${task.project_current_phase_id}`
  
  // Skip if already cached
  if (nextPhaseDescriptionCache.value.has(cacheKey)) {
    return
  }
  
  try {
    // Get next phase
    const { data: nextPhase, error: phaseError } = await supabase
      .from('phases')
      .select('id, name, description, order_index')
      .eq('template_id', task.project_template_id)
      .gt('order_index', task.project_current_phase_order)
      .order('order_index', { ascending: true })
      .limit(1)
      .single()
    
    if (!phaseError && nextPhase) {
      // Cache the description (or name if no description)
      const description = nextPhase.description || nextPhase.name
      nextPhaseDescriptionCache.value.set(cacheKey, description)
    } else {
      // No next phase - cache null to avoid repeated queries
      nextPhaseDescriptionCache.value.set(cacheKey, null)
    }
  } catch (err) {
    console.error('Error fetching next phase description:', err)
    // Cache null on error to avoid repeated failed queries
    nextPhaseDescriptionCache.value.set(cacheKey, null)
  }
}

// Fetch next phase descriptions for all displayed tasks
const fetchNextPhaseDescriptions = async () => {
  const tasksToCheck = displayTasks.value.filter(task => 
    task.project_has_phases && 
    templateHasMultiplePhases(task.project_template_id) &&
    task.project_id &&
    task.project_current_phase_id
  )
  
  // Fetch descriptions for all tasks in parallel (with a limit to avoid too many requests)
  const promises = tasksToCheck.slice(0, 20).map(task => fetchNextPhaseDescription(task))
  await Promise.all(promises)
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
      
      // Immediately generate tasks for the new phase
      const today = new Date().toISOString().split('T')[0]
      const generateResult = await generateTasksFromPhase(task.project_id, nextPhase.id, today)
      
      if (generateResult.error) {
        console.error('Error generating tasks for new phase:', generateResult.error)
        showError('Project advanced but failed to generate tasks: ' + generateResult.error.message)
      } else {
        const taskCount = generateResult.data?.length || 0
        showSuccess(`Project advanced to phase: ${nextPhase.name}. Generated ${taskCount} task(s).`)
      }
    }
    
    // Clear cache and reload tasks to reflect updated project info
    templatePhaseCountCache.value.clear()
    nextPhaseDescriptionCache.value.clear() // Clear next phase descriptions to refresh them
    await loadTasks()
    await checkTemplatePhaseCounts()
    await fetchNextPhaseDescriptions() // Fetch updated next phase descriptions
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

// Watch orderedTasks to update phase counts and fetch next phase descriptions
watch(orderedTasks, async () => {
  await checkTemplatePhaseCounts()
  await fetchNextPhaseDescriptions()
}, { deep: true })

// Auto-refresh interval (every hour)
let refreshInterval = null

// Initialize
onMounted(async () => {
  await loadTasks()
  await checkTemplatePhaseCounts()
  await fetchNextPhaseDescriptions()
  
  // Set up auto-refresh every hour (3600000 ms)
  refreshInterval = setInterval(async () => {
    await loadTasks()
  }, 3600000) // 1 hour in milliseconds
})

// Cleanup interval on unmount
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
})
</script>

