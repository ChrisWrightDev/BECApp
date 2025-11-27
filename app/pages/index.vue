<template>
  <div>
    <div class="mb-4 sm:mb-8">
      <h1 class="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2">Dashboard</h1>
      <p class="text-sm sm:text-base text-base-content/70">
        Welcome back, 
        <ClientOnly>
          <span class="break-words">{{ userEmail }}</span>
          <template #fallback>
            User
          </template>
        </ClientOnly>
      </p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
      <div class="stat bg-base-100 shadow rounded-box p-3 sm:p-4">
        <div class="stat-title text-xs sm:text-sm">Pending Tasks</div>
        <div class="stat-value text-primary text-xl sm:text-2xl lg:text-3xl">{{ pendingCount }}</div>
        <div class="stat-desc text-xs hidden sm:block">Tasks awaiting completion</div>
      </div>

      <div class="stat bg-base-100 shadow rounded-box p-3 sm:p-4">
        <div class="stat-title text-xs sm:text-sm">In Progress</div>
        <div class="stat-value text-secondary text-xl sm:text-2xl lg:text-3xl">{{ inProgressCount }}</div>
        <div class="stat-desc text-xs hidden sm:block">Tasks currently being worked on</div>
      </div>

      <div class="stat bg-base-100 shadow rounded-box p-3 sm:p-4">
        <div class="stat-title text-xs sm:text-sm">Active Projects</div>
        <div class="stat-value text-accent text-xl sm:text-2xl lg:text-3xl">{{ activeProjectsCount }}</div>
        <div class="stat-desc text-xs hidden sm:block">Ongoing projects</div>
      </div>

      <div class="stat bg-base-100 shadow rounded-box p-3 sm:p-4">
        <div class="stat-title text-xs sm:text-sm">Completion Rate</div>
        <div class="stat-value text-success text-xl sm:text-2xl lg:text-3xl">{{ completionRate }}%</div>
        <div class="stat-desc text-xs hidden sm:block">Today's completion rate</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-4 sm:p-6">
          <h2 class="card-title text-base sm:text-lg">Today's Tasks</h2>
          <div class="divider"></div>
          <div v-if="loading" class="flex justify-center py-6 sm:py-8">
            <span class="loading loading-spinner loading-md sm:loading-lg"></span>
          </div>
          <div v-else-if="todayTasks.length === 0" class="text-center py-6 sm:py-8 text-sm sm:text-base text-base-content/70">
            No tasks for today
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="task in todayTasks"
              :key="task.id"
              class="flex items-center justify-between gap-2 p-2 sm:p-3 bg-base-200 rounded-lg"
            >
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm sm:text-base truncate">{{ task.title }}</div>
                <div class="text-xs sm:text-sm text-base-content/70 truncate">{{ task.project_name }}</div>
              </div>
              <div class="badge badge-sm sm:badge-md flex-shrink-0" :class="getStatusBadgeClass(task.status)">
                <span class="hidden sm:inline">{{ task.status }}</span>
                <span class="sm:hidden">{{ getStatusShort(task.status) }}</span>
              </div>
            </div>
          </div>
          <div class="card-actions justify-end mt-3 sm:mt-4">
            <NuxtLink to="/tasks" class="btn btn-primary btn-xs sm:btn-sm">View All Tasks</NuxtLink>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-4 sm:p-6">
          <h2 class="card-title text-base sm:text-lg">Active Projects</h2>
          <div class="divider"></div>
          <div v-if="loading" class="flex justify-center py-6 sm:py-8">
            <span class="loading loading-spinner loading-md sm:loading-lg"></span>
          </div>
          <div v-else-if="activeProjectsList.length === 0" class="text-center py-6 sm:py-8 text-sm sm:text-base text-base-content/70">
            No active projects
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="project in activeProjectsList"
              :key="project.id"
              class="flex items-center justify-between gap-2 p-2 sm:p-3 bg-base-200 rounded-lg"
            >
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm sm:text-base truncate">{{ project.name }}</div>
                <div class="text-xs sm:text-sm text-base-content/70 truncate">Phase: {{ project.current_phase }}</div>
              </div>
              <NuxtLink :to="`/projects/${project.id}`" class="btn btn-ghost btn-xs sm:btn-sm flex-shrink-0">
                View
              </NuxtLink>
            </div>
          </div>
          <div class="card-actions justify-end mt-3 sm:mt-4">
            <NuxtLink to="/projects" class="btn btn-primary btn-xs sm:btn-sm">View All Projects</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { user } = useAuth()
const {
  tasks,
  loading: tasksLoading,
  pendingTasks,
  inProgressTasks,
  fetchTasks
} = useTasks()
const {
  loading: projectsLoading,
  activeProjects,
  fetchProjects
} = useProjects()

const userEmail = computed(() => {
  // During SSR, always return placeholder
  if (process.server) {
    return 'User'
  }
  return user.value?.email || 'User'
})
const loading = computed(() => tasksLoading.value || projectsLoading.value)
const pendingCount = computed(() => pendingTasks.value.length)
const inProgressCount = computed(() => inProgressTasks.value.length)
const activeProjectsCount = computed(() => activeProjects.value.length)
const todayTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return tasks.value.filter(t => t.due_date === today).slice(0, 5)
})
const activeProjectsList = computed(() => activeProjects.value.slice(0, 5))

const completionRate = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const todayTasksList = tasks.value.filter(t => t.due_date === today)
  if (todayTasksList.length === 0) return 0
  const completed = todayTasksList.filter(t => t.status === 'completed').length
  return Math.round((completed / todayTasksList.length) * 100)
})

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

const getStatusShort = (status) => {
  const short = {
    pending: 'P',
    in_progress: 'IP',
    completed: 'C',
    skipped: 'S',
    cancelled: 'X'
  }
  return short[status] || status
}

// Load initial data
onMounted(async () => {
  await Promise.all([
    fetchTasks({ date: new Date().toISOString().split('T')[0] }),
    fetchProjects({ status: 'active' })
  ])
})
</script>

