<template>
  <div>
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-2">Dashboard</h1>
      <p class="text-base-content/70">
        Welcome back, 
        <ClientOnly>
          {{ userEmail }}
          <template #fallback>
            User
          </template>
        </ClientOnly>
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title">Pending Tasks</div>
        <div class="stat-value text-primary">{{ pendingCount }}</div>
        <div class="stat-desc">Tasks awaiting completion</div>
      </div>

      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title">In Progress</div>
        <div class="stat-value text-secondary">{{ inProgressCount }}</div>
        <div class="stat-desc">Tasks currently being worked on</div>
      </div>

      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title">Active Projects</div>
        <div class="stat-value text-accent">{{ activeProjectsCount }}</div>
        <div class="stat-desc">Ongoing projects</div>
      </div>

      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title">Completion Rate</div>
        <div class="stat-value text-success">{{ completionRate }}%</div>
        <div class="stat-desc">Today's completion rate</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Today's Tasks</h2>
          <div class="divider"></div>
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="todayTasks.length === 0" class="text-center py-8 text-base-content/70">
            No tasks for today
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="task in todayTasks"
              :key="task.id"
              class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
            >
              <div>
                <div class="font-semibold">{{ task.title }}</div>
                <div class="text-sm text-base-content/70">{{ task.project_name }}</div>
              </div>
              <div class="badge" :class="getStatusBadgeClass(task.status)">
                {{ task.status }}
              </div>
            </div>
          </div>
          <div class="card-actions justify-end mt-4">
            <NuxtLink to="/tasks" class="btn btn-primary btn-sm">View All Tasks</NuxtLink>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Active Projects</h2>
          <div class="divider"></div>
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="activeProjectsList.length === 0" class="text-center py-8 text-base-content/70">
            No active projects
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="project in activeProjectsList"
              :key="project.id"
              class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
            >
              <div>
                <div class="font-semibold">{{ project.name }}</div>
                <div class="text-sm text-base-content/70">Phase: {{ project.current_phase }}</div>
              </div>
              <NuxtLink :to="`/projects/${project.id}`" class="btn btn-ghost btn-sm">
                View
              </NuxtLink>
            </div>
          </div>
          <div class="card-actions justify-end mt-4">
            <NuxtLink to="/projects" class="btn btn-primary btn-sm">View All Projects</NuxtLink>
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

// Load initial data
onMounted(async () => {
  await Promise.all([
    fetchTasks({ date: new Date().toISOString().split('T')[0] }),
    fetchProjects({ status: 'active' })
  ])
})
</script>

