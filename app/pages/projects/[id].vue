<template>
  <div>
    <!-- Back Button -->
    <div class="mb-6">
      <NuxtLink to="/projects" class="btn btn-ghost btn-sm">
        <Icon name="mdi:arrow-left" class="w-5 h-5" />
        Back to Projects
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error State -->
    <div v-else-if="error || !project" class="alert alert-error">
      <Icon name="mdi:alert-circle" class="w-6 h-6" />
      <span>{{ error || 'Project not found' }}</span>
    </div>

    <!-- Project Details -->
    <div v-else>
      <!-- Header -->
      <div class="mb-8 flex justify-between items-start">
        <div>
          <h1 class="text-4xl font-bold mb-2">{{ project.name }}</h1>
          <p class="text-base-content/70">{{ project.description || 'No description' }}</p>
        </div>
        <div class="flex gap-2">
          <button @click="openEditModal" class="btn btn-outline">
            <Icon name="mdi:pencil" class="w-5 h-5" />
            Edit
          </button>
          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-ghost">
              <Icon name="mdi:dots-vertical" class="w-5 h-5" />
            </div>
            <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
              <li><a @click="openPhaseModal">Change Phase</a></li>
              <li><a @click="deleteProjectConfirm" class="text-error">Delete Project</a></li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Project Info Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Status</div>
          <div class="stat-value text-lg">
            <span class="badge" :class="getStatusBadgeClass(project.status)">
              {{ project.status }}
            </span>
          </div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Template</div>
          <div class="stat-value text-lg">{{ project.template_name }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Current Phase</div>
          <div class="stat-value text-lg">{{ project.current_phase }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Started</div>
          <div class="stat-value text-lg">{{ formatDate(project.started_at) }}</div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Tasks Section -->
        <div class="lg:col-span-2">
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex justify-between items-center mb-4">
                <h2 class="card-title">Project Tasks</h2>
                <div class="flex gap-2">
                  <input
                    v-model="taskDateFilter"
                    type="date"
                    class="input input-bordered input-sm"
                    @change="loadProjectTasks"
                  />
                  <select
                    v-model="taskStatusFilter"
                    class="select select-bordered select-sm"
                    @change="loadProjectTasks"
                  >
                    <option :value="null">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div class="divider"></div>

              <!-- Tasks Loading -->
              <div v-if="tasksLoading" class="flex justify-center py-8">
                <span class="loading loading-spinner"></span>
              </div>

              <!-- Tasks List -->
              <div v-else-if="projectTasks.length > 0" class="space-y-2">
                <div
                  v-for="task in projectTasks"
                  :key="task.id"
                  class="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                >
                  <div class="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      :checked="task.status === 'completed'"
                      @change="handleTaskStatusChange(task, $event.target.checked)"
                      class="checkbox checkbox-primary checkbox-sm"
                    />
                    <div class="flex-1">
                      <div
                        class="font-semibold"
                        :class="{
                          'line-through opacity-60': task.status === 'completed'
                        }"
                      >
                        {{ task.title }}
                      </div>
                      <div class="text-sm text-base-content/70 mt-1">
                        <span v-if="task.time_window" class="badge badge-ghost badge-sm mr-2">
                          {{ task.time_window }}
                        </span>
                        <span v-if="task.scheduled_time">
                          <Icon name="mdi:clock-outline" class="w-4 h-4 inline" />
                          {{ formatTime(task.scheduled_time) }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <select
                    :value="task.status"
                    @change="handleTaskStatusSelect(task.id, $event.target.value)"
                    class="select select-bordered select-sm"
                    :class="getTaskStatusClass(task.status)"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>
              </div>

              <!-- Empty Tasks -->
              <div v-else class="text-center py-8 text-base-content/70">
                No tasks found for this project
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Phase Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Phase Information</h2>
              <div class="divider"></div>
              <div class="space-y-2">
                <div>
                  <span class="text-sm text-base-content/70">Current Phase:</span>
                  <p class="font-semibold">{{ project.current_phase }}</p>
                </div>
                <div v-if="availablePhases.length > 0">
                  <span class="text-sm text-base-content/70">Available Phases:</span>
                  <div class="mt-2 space-y-1">
                    <div
                      v-for="phase in availablePhases"
                      :key="phase.id"
                      class="text-sm p-2 bg-base-200 rounded"
                      :class="{
                        'ring-2 ring-primary': phase.id === project.current_phase_id
                      }"
                    >
                      {{ phase.order_index }}. {{ phase.name }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Project Stats -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Statistics</h2>
              <div class="divider"></div>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-base-content/70">Total Tasks</span>
                  <span class="font-semibold">{{ projectTasks.length }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Completed</span>
                  <span class="font-semibold text-success">
                    {{ completedTasksCount }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">In Progress</span>
                  <span class="font-semibold text-info">
                    {{ inProgressTasksCount }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Pending</span>
                  <span class="font-semibold text-warning">
                    {{ pendingTasksCount }}
                  </span>
                </div>
                <div class="divider"></div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Completion Rate</span>
                  <span class="font-semibold">
                    {{ completionRate }}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Project History -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Project History</h2>
              <div class="divider"></div>
              <div v-if="historyLoading" class="flex justify-center py-4">
                <span class="loading loading-spinner"></span>
              </div>
              <div v-else-if="projectHistory.length > 0" class="space-y-2 max-h-64 overflow-y-auto">
                <div
                  v-for="entry in projectHistory"
                  :key="entry.id"
                  class="text-sm p-2 bg-base-200 rounded"
                >
                  <div class="font-medium">{{ getHistoryActionLabel(entry.action) }}</div>
                  <div class="text-xs text-base-content/60 mt-1">
                    {{ formatDateTime(entry.created_at) }}
                  </div>
                  <div v-if="entry.phase_name" class="text-xs text-base-content/70 mt-1">
                    Phase: {{ entry.phase_name }}
                  </div>
                  <div v-if="entry.metadata?.auto_advanced" class="badge badge-xs badge-info mt-1">
                    Auto-advanced
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-4 text-base-content/70 text-sm">
                No history recorded yet
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Project Modal -->
    <dialog ref="editModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Edit Project</h3>
        <form @submit.prevent="handleUpdate" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Project Name *</span>
            </label>
            <input
              v-model="editForm.name"
              type="text"
              class="input input-bordered"
              required
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Description</span>
            </label>
            <textarea
              v-model="editForm.description"
              class="textarea textarea-bordered"
              rows="3"
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Status</span>
            </label>
            <select v-model="editForm.status" class="select select-bordered">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div class="modal-action">
            <button type="button" @click="closeEditModal" class="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
              Update
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeEditModal">close</button>
      </form>
    </dialog>

    <!-- Change Phase Modal -->
    <dialog ref="phaseModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Change Project Phase</h3>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Select Phase</span>
          </label>
          <select v-model="selectedPhaseId" class="select select-bordered">
            <option :value="null">Select a phase</option>
            <option
              v-for="phase in availablePhases"
              :key="phase.id"
              :value="phase.id"
            >
              {{ phase.order_index }}. {{ phase.name }}
            </option>
          </select>
        </div>
        <div class="modal-action">
          <button @click="closePhaseModal" class="btn btn-ghost">Cancel</button>
          <button @click="handlePhaseChange" class="btn btn-primary" :disabled="submitting || !selectedPhaseId">
            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
            Change Phase
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closePhaseModal">close</button>
      </form>
    </dialog>

    <!-- Delete Confirmation Modal -->
    <dialog ref="deleteModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete Project</h3>
        <p class="mb-4">
          Are you sure you want to delete <strong>{{ project?.name }}</strong>?
          This will also delete all associated tasks. This action cannot be undone.
        </p>
        <div class="modal-action">
          <button @click="closeDeleteModal" class="btn btn-ghost">Cancel</button>
          <button @click="confirmDelete" class="btn btn-error" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeleteModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const projectId = route.params.id

const {
  projects,
  templates,
  loading,
  error,
  projectById,
  fetchProjects,
  fetchProjectById,
  fetchPhases,
  updateProject,
  deleteProject,
  fetchProjectHistory
} = useProjects()

const {
  tasks: allTasks,
  loading: tasksLoading,
  fetchTasks,
  updateTaskStatus,
  generateTasksForProject
} = useTasks()
const { showSuccess, showError } = useNotifications()

const project = ref(null)
const availablePhases = ref([])
const projectTasks = ref([])
const projectHistory = ref([])
const taskDateFilter = ref(new Date().toISOString().split('T')[0])
const taskStatusFilter = ref(null)
const submitting = ref(false)
const historyLoading = ref(false)

const editModal = ref(null)
const phaseModal = ref(null)
const deleteModal = ref(null)

const editForm = ref({
  name: '',
  description: '',
  status: 'active'
})

const selectedPhaseId = ref(null)

// Computed
const completedTasksCount = computed(() => {
  return projectTasks.value.filter(t => t.status === 'completed').length
})

const inProgressTasksCount = computed(() => {
  return projectTasks.value.filter(t => t.status === 'in_progress').length
})

const pendingTasksCount = computed(() => {
  return projectTasks.value.filter(t => t.status === 'pending').length
})

const completionRate = computed(() => {
  if (projectTasks.value.length === 0) return 0
  return Math.round((completedTasksCount.value / projectTasks.value.length) * 100)
})

// Methods
const loadProject = async () => {
  const { data, error: fetchError } = await fetchProjectById(projectId)
  if (fetchError) {
    error.value = fetchError.message
    return
  }
  if (data) {
    project.value = data
    await loadPhases()
    await loadProjectHistory()
  }
}

const loadProjectHistory = async () => {
  historyLoading.value = true
  try {
    const { data } = await fetchProjectHistory(projectId)
    if (data) {
      projectHistory.value = data
    }
  } catch (err) {
    console.error('Error loading project history:', err)
  } finally {
    historyLoading.value = false
  }
}

const loadPhases = async () => {
  if (!project.value?.template_id) return
  const { data } = await fetchPhases(project.value.template_id)
  if (data) {
    availablePhases.value = data
  }
}

const loadProjectTasks = async () => {
  const options = {
    projectId: projectId
  }
  if (taskDateFilter.value) {
    options.date = taskDateFilter.value
  }
  if (taskStatusFilter.value) {
    options.status = taskStatusFilter.value
  }
  
  const { data } = await fetchTasks(options)
  if (data) {
    projectTasks.value = data
  }
}

const openEditModal = () => {
  editForm.value = {
    name: project.value.name,
    description: project.value.description || '',
    status: project.value.status
  }
  editModal.value?.showModal()
}

const closeEditModal = () => {
  editModal.value?.close()
}

const handleUpdate = async () => {
  submitting.value = true
  try {
    await updateProject(projectId, editForm.value)
    showSuccess('Project updated successfully')
    await loadProject()
    closeEditModal()
  } catch (err) {
    console.error('Error updating project:', err)
    showError('Error updating project: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const openPhaseModal = async () => {
  await loadPhases()
  selectedPhaseId.value = project.value.current_phase_id
  phaseModal.value?.showModal()
}

const closePhaseModal = () => {
  phaseModal.value?.close()
  selectedPhaseId.value = null
}

const handlePhaseChange = async () => {
  submitting.value = true
  try {
    await updateProject(projectId, { current_phase_id: selectedPhaseId.value })
    await loadProject()
    // Generate tasks for the new phase
    await generateTasksForProject(projectId)
    await loadProjectTasks()
    showSuccess('Phase changed successfully')
    closePhaseModal()
  } catch (err) {
    console.error('Error changing phase:', err)
    showError('Error changing phase: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const deleteProjectConfirm = () => {
  deleteModal.value?.showModal()
}

const closeDeleteModal = () => {
  deleteModal.value?.close()
}

const confirmDelete = async () => {
  submitting.value = true
  try {
    await deleteProject(projectId)
    showSuccess('Project deleted successfully')
    router.push('/projects')
  } catch (err) {
    console.error('Error deleting project:', err)
    showError('Error deleting project: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const handleTaskStatusChange = async (task, isCompleted) => {
  const newStatus = isCompleted ? 'completed' : 'pending'
  await updateTaskStatus(task.id, newStatus)
  await loadProjectTasks()
}

const handleTaskStatusSelect = async (taskId, status) => {
  await updateTaskStatus(taskId, status)
  await loadProjectTasks()
}

const getStatusBadgeClass = (status) => {
  const classes = {
    active: 'badge-success',
    paused: 'badge-warning',
    completed: 'badge-info',
    cancelled: 'badge-error'
  }
  return classes[status] || 'badge-ghost'
}

const getTaskStatusClass = (status) => {
  const classes = {
    pending: 'select-warning',
    in_progress: 'select-info',
    completed: 'select-success',
    skipped: 'select-ghost'
  }
  return classes[status] || ''
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
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

const formatDateTime = (dateTime) => {
  if (!dateTime) return 'N/A'
  const date = new Date(dateTime)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const getHistoryActionLabel = (action) => {
  const labels = {
    project_created: 'Project Created',
    phase_started: 'Phase Started',
    phase_completed: 'Phase Completed',
    status_changed: 'Status Changed',
    project_completed: 'Project Completed'
  }
  return labels[action] || action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Initialize
onMounted(async () => {
  await loadProject()
  await loadProjectTasks()
})
</script>

