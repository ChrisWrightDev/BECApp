<template>
  <div>
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-2">Admin Dashboard</h1>
      <p class="text-base-content/70">System administration and management</p>
    </div>

    <!-- Quick Stats -->
    <div v-if="!loading && systemStats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title">Total Projects</div>
        <div class="stat-value text-primary text-2xl">{{ systemStats.projects || 0 }}</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title">Total Tasks</div>
        <div class="stat-value text-secondary text-2xl">{{ systemStats.tasks || 0 }}</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title">Templates</div>
        <div class="stat-value text-accent text-2xl">{{ systemStats.templates || 0 }}</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title">Users</div>
        <div class="stat-value text-info text-2xl">{{ systemStats.users || 0 }}</div>
      </div>
    </div>

    <!-- System Controls -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title mb-4">
          <Icon name="mdi:cog" class="w-6 h-6" />
          System Controls
        </h2>
        <div class="divider"></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex items-center justify-between p-4 bg-base-200 rounded-lg">
            <div>
              <h3 class="font-semibold">Generate Daily Tasks</h3>
              <p class="text-sm text-base-content/70">
                Manually trigger task generation for all active projects
              </p>
            </div>
            <button
              @click="handleGenerateTasks"
              class="btn btn-primary"
              :disabled="generatingTasks"
            >
              <span v-if="generatingTasks" class="loading loading-spinner loading-sm"></span>
              <Icon v-else name="mdi:refresh" class="w-5 h-5" />
              Generate
            </button>
          </div>

          <div class="flex items-center justify-between p-4 bg-base-200 rounded-lg">
            <div>
              <h3 class="font-semibold">Check Phase Advancement</h3>
              <p class="text-sm text-base-content/70">
                Manually check and advance phases based on duration
              </p>
            </div>
            <button
              @click="handleAdvancePhases"
              class="btn btn-secondary"
              :disabled="advancingPhases"
            >
              <span v-if="advancingPhases" class="loading loading-spinner loading-sm"></span>
              <Icon v-else name="mdi:arrow-right-circle" class="w-5 h-5" />
              Check
            </button>
          </div>
        </div>

        <!-- Operation Result -->
        <div v-if="lastOperationResult" class="mt-4">
          <div
            class="alert"
            :class="lastOperationResult.success ? 'alert-success' : 'alert-error'"
          >
            <Icon
              :name="lastOperationResult.success ? 'mdi:check-circle' : 'mdi:alert-circle'"
              class="w-6 h-6"
            />
            <span>{{ lastOperationResult.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Admin Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink to="/admin/templates" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
        <div class="card-body">
          <h2 class="card-title">
            <Icon name="mdi:file-document-outline" class="w-6 h-6" />
            Templates
          </h2>
          <p>Manage project templates, phases, and tasks</p>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/users" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
        <div class="card-body">
          <h2 class="card-title">
            <Icon name="mdi:account-group" class="w-6 h-6" />
            Users
          </h2>
          <p>Manage users and permissions</p>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/analytics" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
        <div class="card-body">
          <h2 class="card-title">
            <Icon name="mdi:chart-line" class="w-6 h-6" />
            Analytics
          </h2>
          <p>View system analytics and metrics</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const { loading, fetchSystemStats } = useAnalytics()
const { generateDailyTasks } = useTasks()
const { checkAndAdvancePhases } = useProjects()

const systemStats = ref(null)
const generatingTasks = ref(false)
const advancingPhases = ref(false)
const lastOperationResult = ref(null)

const { showSuccess, showError } = useNotifications()

const handleGenerateTasks = async () => {
  generatingTasks.value = true
  lastOperationResult.value = null
  
  try {
    const { data, error } = await generateDailyTasks()
    if (error) {
      const message = `Error generating tasks: ${error.message}`
      lastOperationResult.value = { success: false, message }
      showError(message)
    } else {
      const message = `Successfully generated ${data?.length || 0} tasks for today`
      lastOperationResult.value = { success: true, message }
      showSuccess(message)
      // Refresh stats
      const result = await fetchSystemStats()
      if (result.data) {
        systemStats.value = result.data
      }
    }
  } catch (err) {
    const message = `Error: ${err.message}`
    lastOperationResult.value = { success: false, message }
    showError(message)
  } finally {
    generatingTasks.value = false
  }
}

const handleAdvancePhases = async () => {
  advancingPhases.value = true
  lastOperationResult.value = null
  
  try {
    const { data, error } = await checkAndAdvancePhases()
    if (error) {
      const message = `Error checking phases: ${error.message}`
      lastOperationResult.value = { success: false, message }
      showError(message)
    } else {
      const advancedCount = data?.length || 0
      let message
      if (advancedCount > 0) {
        message = `Successfully advanced ${advancedCount} project phase(s)`
        showSuccess(message)
      } else {
        message = 'No projects ready for phase advancement'
        showInfo(message)
      }
      lastOperationResult.value = { success: true, message }
      // Refresh stats
      const result = await fetchSystemStats()
      if (result.data) {
        systemStats.value = result.data
      }
    }
  } catch (err) {
    const message = `Error: ${err.message}`
    lastOperationResult.value = { success: false, message }
    showError(message)
  } finally {
    advancingPhases.value = false
  }
}

onMounted(async () => {
  const result = await fetchSystemStats()
  if (result.data) {
    systemStats.value = result.data
  }
})
</script>

