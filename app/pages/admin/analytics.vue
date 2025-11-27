<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-4xl font-bold mb-2">Analytics & Metrics</h1>
        <p class="text-base-content/70">System-wide statistics and insights</p>
      </div>
      <div class="flex gap-2">
        <select
          v-model="dateRangeDays"
          class="select select-bordered"
          @change="loadAnalytics"
        >
          <option :value="7">Last 7 days</option>
          <option :value="30">Last 30 days</option>
          <option :value="90">Last 90 days</option>
          <option :value="365">Last year</option>
        </select>
        <button @click="loadAnalytics" class="btn btn-outline">
          <Icon name="mdi:refresh" class="w-5 h-5" />
          Refresh
        </button>
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

    <!-- Analytics Content -->
    <div v-else class="space-y-6">
      <!-- System Overview Stats -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Projects</div>
          <div class="stat-value text-primary text-2xl">{{ systemStats?.projects || 0 }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Tasks</div>
          <div class="stat-value text-secondary text-2xl">{{ systemStats?.tasks || 0 }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Templates</div>
          <div class="stat-value text-accent text-2xl">{{ systemStats?.templates || 0 }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Mated Pairs</div>
          <div class="stat-value text-info text-2xl">{{ systemStats?.pairs || 0 }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Tanks</div>
          <div class="stat-value text-success text-2xl">{{ systemStats?.tanks || 0 }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Users</div>
          <div class="stat-value text-warning text-2xl">{{ systemStats?.users || 0 }}</div>
        </div>
      </div>

      <!-- Project Statistics -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Project Statistics</h2>
          <div class="divider"></div>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div class="stat">
              <div class="stat-title">Total</div>
              <div class="stat-value text-lg">{{ projectStats?.total || 0 }}</div>
            </div>
            <div class="stat">
              <div class="stat-title">Active</div>
              <div class="stat-value text-lg text-success">{{ projectStats?.active || 0 }}</div>
            </div>
            <div class="stat">
              <div class="stat-title">Paused</div>
              <div class="stat-value text-lg text-warning">{{ projectStats?.paused || 0 }}</div>
            </div>
            <div class="stat">
              <div class="stat-title">Completed</div>
              <div class="stat-value text-lg text-info">{{ projectStats?.completed || 0 }}</div>
            </div>
            <div class="stat">
              <div class="stat-title">Cancelled</div>
              <div class="stat-value text-lg text-error">{{ projectStats?.cancelled || 0 }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Task Statistics -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Task Status Breakdown</h2>
            <div class="divider"></div>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span>Pending</span>
                <div class="flex items-center gap-2">
                  <progress
                    class="progress progress-warning w-32"
                    :value="taskStats?.pending || 0"
                    :max="taskStats?.total || 1"
                  ></progress>
                  <span class="font-semibold">{{ taskStats?.pending || 0 }}</span>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span>In Progress</span>
                <div class="flex items-center gap-2">
                  <progress
                    class="progress progress-info w-32"
                    :value="taskStats?.in_progress || 0"
                    :max="taskStats?.total || 1"
                  ></progress>
                  <span class="font-semibold">{{ taskStats?.in_progress || 0 }}</span>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span>Completed</span>
                <div class="flex items-center gap-2">
                  <progress
                    class="progress progress-success w-32"
                    :value="taskStats?.completed || 0"
                    :max="taskStats?.total || 1"
                  ></progress>
                  <span class="font-semibold">{{ taskStats?.completed || 0 }}</span>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span>Skipped</span>
                <div class="flex items-center gap-2">
                  <progress
                    class="progress progress-ghost w-32"
                    :value="taskStats?.skipped || 0"
                    :max="taskStats?.total || 1"
                  ></progress>
                  <span class="font-semibold">{{ taskStats?.skipped || 0 }}</span>
                </div>
              </div>
              <div class="divider"></div>
              <div class="flex justify-between items-center">
                <span class="font-semibold">Completion Rate</span>
                <span class="stat-value text-lg">{{ taskStats?.completionRate || 0 }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Tasks by Time Window</h2>
            <div class="divider"></div>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="capitalize">Morning</span>
                <div class="flex items-center gap-2">
                  <progress
                    class="progress progress-primary w-32"
                    :value="taskStats?.byTimeWindow?.morning || 0"
                    :max="getMaxTimeWindow()"
                  ></progress>
                  <span class="font-semibold">{{ taskStats?.byTimeWindow?.morning || 0 }}</span>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="capitalize">Midday</span>
                <div class="flex items-center gap-2">
                  <progress
                    class="progress progress-secondary w-32"
                    :value="taskStats?.byTimeWindow?.midday || 0"
                    :max="getMaxTimeWindow()"
                  ></progress>
                  <span class="font-semibold">{{ taskStats?.byTimeWindow?.midday || 0 }}</span>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="capitalize">Afternoon</span>
                <div class="flex items-center gap-2">
                  <progress
                    class="progress progress-accent w-32"
                    :value="taskStats?.byTimeWindow?.afternoon || 0"
                    :max="getMaxTimeWindow()"
                  ></progress>
                  <span class="font-semibold">{{ taskStats?.byTimeWindow?.afternoon || 0 }}</span>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="capitalize">Evening</span>
                <div class="flex items-center gap-2">
                  <progress
                    class="progress progress-info w-32"
                    :value="taskStats?.byTimeWindow?.evening || 0"
                    :max="getMaxTimeWindow()"
                  ></progress>
                  <span class="font-semibold">{{ taskStats?.byTimeWindow?.evening || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Template Usage -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Template Usage</h2>
          <div class="divider"></div>
          <div v-if="templateStats && templateStats.length > 0" class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Type</th>
                  <th>Total Projects</th>
                  <th>Active</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="template in templateStats" :key="template.id">
                  <td>{{ template.name }}</td>
                  <td>
                    <span class="badge badge-ghost capitalize">
                      {{ template.type.replace('_', ' ') }}
                    </span>
                  </td>
                  <td>{{ template.totalProjects }}</td>
                  <td>
                    <span class="badge badge-success">{{ template.activeProjects }}</span>
                  </td>
                  <td>
                    <span class="badge badge-info">{{ template.completedProjects }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-center py-8 text-base-content/70">
            No template usage data available
          </div>
        </div>
      </div>

      <!-- Activity Over Time -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Activity Over Time (Last {{ dateRangeDays }} days)</h2>
          <div class="divider"></div>
          <div v-if="activityStats && Object.keys(activityStats).length > 0" class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="(activity, date) in sortedActivityStats"
              :key="date"
              class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
            >
              <div class="flex-1">
                <div class="font-semibold">{{ formatDate(date) }}</div>
                <div class="text-sm text-base-content/70 mt-1">
                  <span class="badge badge-success badge-sm mr-2">
                    {{ activity.tasksCompleted }} tasks completed
                  </span>
                  <span class="badge badge-primary badge-sm mr-2">
                    {{ activity.projectsCreated }} projects created
                  </span>
                  <span class="badge badge-info badge-sm">
                    {{ activity.phasesChanged }} phase changes
                  </span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-primary">
                  {{ activity.tasksCompleted + activity.projectsCreated + activity.phasesChanged }}
                </div>
                <div class="text-xs text-base-content/60">Total events</div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-base-content/70">
            No activity data available
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const {
  loading,
  error,
  fetchSystemStats,
  fetchProjectStats,
  fetchTaskStats,
  fetchTemplateStats,
  fetchActivityStats
} = useAnalytics()

const systemStats = ref(null)
const projectStats = ref(null)
const taskStats = ref(null)
const templateStats = ref(null)
const activityStats = ref(null)
const dateRangeDays = ref(30)

// Computed
const sortedActivityStats = computed(() => {
  if (!activityStats.value) return {}
  
  const sorted = {}
  const dates = Object.keys(activityStats.value).sort()
  dates.forEach(date => {
    sorted[date] = activityStats.value[date]
  })
  return sorted
})

// Methods
const loadAnalytics = async () => {
  const [systemResult, projectResult, taskResult, templateResult, activityResult] = await Promise.all([
    fetchSystemStats(),
    fetchProjectStats(),
    fetchTaskStats(),
    fetchTemplateStats(),
    fetchActivityStats(dateRangeDays.value)
  ])

  if (systemResult.data) systemStats.value = systemResult.data
  if (projectResult.data) projectStats.value = projectResult.data
  if (taskResult.data) taskStats.value = taskResult.data
  if (templateResult.data) templateStats.value = templateResult.data
  if (activityResult.data) activityStats.value = activityResult.data
}

const getMaxTimeWindow = () => {
  if (!taskStats.value?.byTimeWindow) return 1
  const values = Object.values(taskStats.value.byTimeWindow)
  return Math.max(...values, 1)
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Initialize
onMounted(async () => {
  await loadAnalytics()
})
</script>


