<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-4xl font-bold mb-2">Task Calendar</h1>
        <p class="text-base-content/70">View your tasks in a calendar format</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/" class="btn btn-ghost">
          <Icon name="mdi:format-list-bulleted" class="w-5 h-5" />
          List View
        </NuxtLink>
        <button @click="previousMonth" class="btn btn-outline">
          <Icon name="mdi:chevron-left" class="w-5 h-5" />
        </button>
        <button @click="goToToday" class="btn btn-outline">
          Today
        </button>
        <button @click="nextMonth" class="btn btn-outline">
          <Icon name="mdi:chevron-right" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Month Header -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="text-2xl font-bold text-center">
          {{ currentMonthName }} {{ currentYear }}
        </h2>
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

    <!-- Calendar Grid -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body p-4">
        <!-- Day Headers -->
        <div class="grid grid-cols-7 gap-2 mb-2">
          <div
            v-for="day in dayHeaders"
            :key="day"
            class="text-center font-semibold text-base-content/70 py-2"
          >
            {{ day }}
          </div>
        </div>

        <!-- Calendar Days -->
        <div class="grid grid-cols-7 gap-2">
          <div
            v-for="day in calendarDays"
            :key="day.date"
            class="min-h-24 border border-base-300 rounded-lg p-2"
            :class="{
              'bg-base-200': !day.isCurrentMonth,
              'bg-base-100': day.isCurrentMonth,
              'ring-2 ring-primary': day.isToday,
              'hover:bg-base-200': day.isCurrentMonth
            }"
          >
            <div class="flex justify-between items-start mb-1">
              <span
                class="text-sm font-semibold"
                :class="{
                  'text-base-content/50': !day.isCurrentMonth,
                  'text-primary': day.isToday,
                  'text-base-content': day.isCurrentMonth && !day.isToday
                }"
              >
                {{ day.dayNumber }}
              </span>
              <span
                v-if="day.taskCount > 0"
                class="badge badge-sm"
                :class="getTaskCountBadgeClass(day.taskCount)"
              >
                {{ day.taskCount }}
              </span>
            </div>
            <div class="space-y-1 mt-1">
              <div
                v-for="task in day.tasks.slice(0, 3)"
                :key="task.id"
                class="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
                :class="getTaskStatusClass(task.status)"
                @click="openTaskModal(task)"
                :title="task.title"
              >
                <div class="truncate">{{ task.title }}</div>
              </div>
              <div
                v-if="day.tasks.length > 3"
                class="text-xs text-base-content/60 text-center pt-1"
              >
                +{{ day.tasks.length - 3 }} more
              </div>
            </div>
          </div>
        </div>
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
          <div>
            <label class="label">
              <span class="label-text font-semibold">Status</span>
            </label>
            <p>
              <span class="badge" :class="getStatusBadgeClass(selectedTask.status)">
                {{ selectedTask.status }}
              </span>
            </p>
          </div>
          <div v-if="selectedTask.time_window">
            <label class="label">
              <span class="label-text font-semibold">Time Window</span>
            </label>
            <p class="text-base-content/70 capitalize">{{ selectedTask.time_window }}</p>
          </div>
          <div v-if="selectedTask.scheduled_time">
            <label class="label">
              <span class="label-text font-semibold">Scheduled Time</span>
            </label>
            <p class="text-base-content/70">{{ formatTime(selectedTask.scheduled_time) }}</p>
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Update Status</span>
            </label>
            <select
              :value="selectedTask.status"
              @change="handleStatusChange(selectedTask.id, $event.target.value)"
              class="select select-bordered"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
              <option value="cancelled">Cancelled</option>
            </select>
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

const {
  tasks,
  loading,
  error,
  fetchTasks,
  updateTaskStatus
} = useTasks()

const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())
const taskModal = ref(null)
const selectedTask = ref(null)

const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Computed
const currentMonthName = computed(() => {
  return new Date(currentYear.value, currentMonth.value).toLocaleDateString('en-US', {
    month: 'long'
  })
})

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()
  
  // Get previous month's days to fill the first week
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate()
  
  const days = []
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  // Previous month's trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(prevYear, prevMonth, prevMonthLastDay - i)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayNumber: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      tasks: getTasksForDate(dateStr),
      taskCount: getTasksForDate(dateStr).length
    })
  }
  
  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      tasks: getTasksForDate(dateStr),
      taskCount: getTasksForDate(dateStr).length
    })
  }
  
  // Next month's leading days to fill the last week
  const remainingDays = 42 - days.length // 6 weeks * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    const date = new Date(nextYear, nextMonth, day)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      tasks: getTasksForDate(dateStr),
      taskCount: getTasksForDate(dateStr).length
    })
  }
  
  return days
})

// Methods
const getTasksForDate = (dateStr) => {
  return tasks.value.filter(task => task.due_date === dateStr)
}

const previousMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
  loadMonthTasks()
}

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
  loadMonthTasks()
}

const goToToday = () => {
  const today = new Date()
  currentMonth.value = today.getMonth()
  currentYear.value = today.getFullYear()
  loadMonthTasks()
}

const loadMonthTasks = async () => {
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)
  
  const startDate = firstDay.toISOString().split('T')[0]
  const endDate = lastDay.toISOString().split('T')[0]
  
  // Fetch tasks for the month range
  // Note: We'll fetch all tasks and filter client-side, or you could add date range to fetchTasks
  await fetchTasks()
}

const openTaskModal = (task) => {
  selectedTask.value = task
  taskModal.value?.showModal()
}

const handleStatusChange = async (taskId, status) => {
  await updateTaskStatus(taskId, status)
  await loadMonthTasks()
}

const getTaskCountBadgeClass = (count) => {
  if (count >= 5) return 'badge-error'
  if (count >= 3) return 'badge-warning'
  return 'badge-info'
}

const getTaskStatusClass = (status) => {
  const classes = {
    pending: 'bg-warning/20 text-warning-content',
    in_progress: 'bg-info/20 text-info-content',
    completed: 'bg-success/20 text-success-content',
    skipped: 'bg-base-300 text-base-content',
    cancelled: 'bg-error/20 text-error-content'
  }
  return classes[status] || 'bg-base-300'
}

const getStatusBadgeClass = (status) => {
  const classes = {
    pending: 'badge-warning',
    in_progress: 'badge-info',
    completed: 'badge-success',
    skipped: 'badge-ghost',
    cancelled: 'badge-error'
  }
  return classes[status] || 'badge-ghost'
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (time) => {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

// Initialize
onMounted(async () => {
  await loadMonthTasks()
})
</script>


