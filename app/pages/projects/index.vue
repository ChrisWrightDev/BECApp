<template>
  <div>
    <div class="mb-4 sm:mb-8">
      <div class="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 class="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2">Projects</h1>
          <p class="text-sm sm:text-base text-base-content/70">Manage your aquaculture projects</p>
        </div>
        <button @click="openCreateModal" class="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto">
          <Icon name="mdi:plus" class="w-4 h-4 sm:w-5 sm:h-5" />
          New Project
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-4 sm:mb-6">
      <div class="card-body p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div class="form-control w-full sm:w-auto sm:min-w-[150px]">
            <label class="label py-1 sm:py-2">
              <span class="label-text text-sm sm:text-base">Status</span>
            </label>
            <select
              v-model="statusFilter"
              class="select select-bordered w-full text-sm sm:text-base"
              @change="loadProjects"
            >
              <option :value="null">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div class="form-control flex items-end w-full sm:w-auto">
            <button @click="clearFilter" class="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto">
              Clear Filter
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

    <!-- Projects Grid -->
    <div v-else-if="displayProjects.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      <div
        v-for="project in displayProjects"
        :key="project.id"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
      >
        <div class="card-body p-4 sm:p-6">
          <div class="flex justify-between items-start mb-2">
            <h2 class="card-title text-base sm:text-lg break-words flex-1 min-w-0">{{ project.name }}</h2>
            <div class="dropdown dropdown-end flex-shrink-0">
              <div tabindex="0" role="button" class="btn btn-ghost btn-xs sm:btn-sm btn-circle">
                <Icon name="mdi:dots-vertical" class="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                <li><a @click="openEditModal(project)">Edit</a></li>
                <li><a @click="viewProjectDetails(project)">View Details</a></li>
                <li><a @click="deleteProjectConfirm(project)" class="text-error">Delete</a></li>
              </ul>
            </div>
          </div>
          <p v-if="project.description" class="text-xs sm:text-sm text-base-content/70 mb-3 sm:mb-4 line-clamp-2 break-words">
            {{ project.description }}
          </p>
          <div class="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
            <div class="flex items-center gap-2">
              <Icon name="mdi:file-document-outline" class="w-3 h-3 sm:w-4 sm:h-4 text-base-content/50 flex-shrink-0" />
              <span class="text-xs sm:text-sm text-base-content/70 truncate">{{ project.template_name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Icon name="mdi:chart-timeline-variant" class="w-3 h-3 sm:w-4 sm:h-4 text-base-content/50 flex-shrink-0" />
              <span class="text-xs sm:text-sm text-base-content/70">Phase: {{ project.current_phase }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Icon name="mdi:calendar-start" class="w-3 h-3 sm:w-4 sm:h-4 text-base-content/50 flex-shrink-0" />
              <span class="text-xs sm:text-sm text-base-content/70">
                Started: {{ formatDate(project.started_at) }}
              </span>
            </div>
          </div>
          <div class="card-actions justify-between items-center flex-wrap gap-2">
            <span class="badge badge-sm sm:badge-md" :class="getStatusBadgeClass(project.status)">
              {{ project.status }}
            </span>
            <NuxtLink :to="`/projects/${project.id}`" class="btn btn-primary btn-xs sm:btn-sm">
              View
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <Icon name="mdi:folder-outline" class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <p class="text-lg text-base-content/70">No projects found</p>
        <p class="text-sm text-base-content/50 mt-2">
          Create your first project to get started
        </p>
        <button @click="openCreateModal" class="btn btn-primary mt-4">
          Create Project
        </button>
      </div>
    </div>

    <!-- Create/Edit Project Modal -->
    <dialog ref="projectModal" class="modal">
      <div class="modal-box w-11/12 max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 class="font-bold text-base sm:text-lg mb-3 sm:mb-4">
          {{ editingProject ? 'Edit Project' : 'Create New Project' }}
        </h3>
        <form @submit.prevent="handleSubmit" class="space-y-3 sm:space-y-4">
          <div class="form-control">
            <label class="label py-1 sm:py-2">
              <span class="label-text text-sm sm:text-base">Project Name *</span>
            </label>
            <input
              v-model="projectForm.name"
              type="text"
              placeholder="Enter project name"
              class="input input-bordered w-full text-sm sm:text-base"
              required
            />
          </div>

          <div class="form-control">
            <label class="label py-1 sm:py-2">
              <span class="label-text text-sm sm:text-base">Description</span>
            </label>
            <textarea
              v-model="projectForm.description"
              placeholder="Enter project description"
              class="textarea textarea-bordered w-full text-sm sm:text-base"
              rows="3"
            />
          </div>

          <div class="form-control">
            <label class="label py-1 sm:py-2">
              <span class="label-text text-sm sm:text-base">Template *</span>
            </label>
            <select
              v-model="projectForm.template_id"
              class="select select-bordered w-full text-sm sm:text-base"
              required
              :disabled="loadingTemplates"
            >
              <option :value="null">Select a template</option>
              <option
                v-for="template in templates"
                :key="template.id"
                :value="template.id"
              >
                {{ template.name }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label py-1 sm:py-2">
              <span class="label-text text-sm sm:text-base">Tank</span>
            </label>
            <select
              v-model="projectForm.tank_id"
              class="select select-bordered w-full text-sm sm:text-base"
              :disabled="loadingTanks"
            >
              <option :value="null">No Tank</option>
              <option
                v-for="tank in activeTanks"
                :key="tank.id"
                :value="tank.id"
              >
                {{ tank.name }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label py-1 sm:py-2">
              <span class="label-text text-sm sm:text-base">Status</span>
            </label>
            <select v-model="projectForm.status" class="select select-bordered w-full text-sm sm:text-base">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div v-if="editingProject && editingProject.status === 'active'" class="form-control">
            <label class="label py-1 sm:py-2">
              <span class="label-text text-sm sm:text-base">Start Date</span>
            </label>
            <input
              v-model="projectForm.started_at"
              type="date"
              class="input input-bordered w-full text-sm sm:text-base"
            />
            <label class="label">
              <span class="label-text-alt text-base-content/50">Change the original start date if it was entered incorrectly</span>
            </label>
          </div>

          <div class="modal-action mt-4 sm:mt-6 flex-col sm:flex-row gap-2">
            <button type="button" @click="closeModal" class="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto order-2 sm:order-1">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto order-1 sm:order-2" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner loading-xs sm:loading-sm"></span>
              {{ editingProject ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal">close</button>
      </form>
    </dialog>

    <!-- Delete Confirmation Modal -->
    <dialog ref="deleteModal" class="modal">
      <div class="modal-box w-11/12 max-w-lg">
        <h3 class="font-bold text-base sm:text-lg mb-3 sm:mb-4">Delete Project</h3>
        <p class="mb-4 text-sm sm:text-base break-words">
          Are you sure you want to delete <strong>{{ projectToDelete?.name }}</strong>?
          This action cannot be undone.
        </p>
        <div class="modal-action mt-4 sm:mt-6 flex-col sm:flex-row gap-2">
          <button @click="closeDeleteModal" class="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto order-2 sm:order-1">Cancel</button>
          <button @click="confirmDelete" class="btn btn-error btn-sm sm:btn-md w-full sm:w-auto order-1 sm:order-2" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-xs sm:loading-sm"></span>
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

const {
  projects,
  templates,
  loading,
  error,
  activeProjects,
  fetchProjects,
  fetchTemplates,
  createProject,
  updateProject,
  deleteProject
} = useProjects()

const {
  tanks,
  activeTanks,
  fetchTanks
} = usePairs()

const { generateTasksForProject } = useTasks()
const { showSuccess, showError } = useNotifications()

const projectModal = ref(null)
const deleteModal = ref(null)
const statusFilter = ref(null)
const editingProject = ref(null)
const projectToDelete = ref(null)
const submitting = ref(false)
const loadingTemplates = ref(false)
const loadingTanks = ref(false)

const projectForm = ref({
  name: '',
  description: '',
  template_id: null,
  tank_id: null,
  status: 'active',
  started_at: null
})

// Computed
const displayProjects = computed(() => {
  if (statusFilter.value) {
    return projects.value.filter(p => p.status === statusFilter.value)
  }
  return projects.value
})

// Methods
const loadProjects = async () => {
  const options = {}
  if (statusFilter.value) options.status = statusFilter.value
  await fetchProjects(options)
}

const loadTemplates = async () => {
  loadingTemplates.value = true
  await fetchTemplates()
  loadingTemplates.value = false
}

const loadTanks = async () => {
  loadingTanks.value = true
  await fetchTanks({ status: 'active' })
  loadingTanks.value = false
}

const openCreateModal = async () => {
  editingProject.value = null
  projectForm.value = {
    name: '',
    description: '',
    template_id: null,
    tank_id: null,
    status: 'active',
    started_at: null
  }
  await Promise.all([loadTemplates(), loadTanks()])
  projectModal.value?.showModal()
}

const openEditModal = async (project) => {
  editingProject.value = project
  // Format started_at date for input (YYYY-MM-DD)
  const startedAtDate = project.started_at 
    ? new Date(project.started_at).toISOString().split('T')[0]
    : null
  
  projectForm.value = {
    name: project.name,
    description: project.description || '',
    template_id: project.template_id,
    tank_id: project.tank_id || null,
    status: project.status,
    started_at: startedAtDate
  }
  await Promise.all([loadTemplates(), loadTanks()])
  projectModal.value?.showModal()
}

const closeModal = () => {
  projectModal.value?.close()
  editingProject.value = null
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    if (editingProject.value) {
      // Prepare update data
      const updateData = { ...projectForm.value }
      
      // Convert started_at date string to ISO timestamp if provided
      if (updateData.started_at) {
        updateData.started_at = new Date(updateData.started_at).toISOString()
      } else {
        // Remove started_at from update if not provided (don't change it)
        delete updateData.started_at
      }
      
      await updateProject(editingProject.value.id, updateData)
      showSuccess('Project updated successfully')
    } else {
      const { data: newProject, error: projectError } = await createProject(projectForm.value)
      if (projectError) {
        showError('Error creating project: ' + projectError.message)
        return
      }
      if (newProject) {
        // Generate initial tasks for the new project
        await generateTasksForProject(newProject.id)
        showSuccess('Project created successfully')
      }
    }
    closeModal()
    await loadProjects()
  } catch (err) {
    console.error('Error saving project:', err)
    showError('Error saving project: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const deleteProjectConfirm = (project) => {
  projectToDelete.value = project
  deleteModal.value?.showModal()
}

const closeDeleteModal = () => {
  deleteModal.value?.close()
  projectToDelete.value = null
}

const confirmDelete = async () => {
  if (!projectToDelete.value) return
  
  submitting.value = true
  try {
    await deleteProject(projectToDelete.value.id)
    showSuccess('Project deleted successfully')
    closeDeleteModal()
    await loadProjects()
  } catch (err) {
    console.error('Error deleting project:', err)
    showError('Error deleting project: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const viewProjectDetails = (project) => {
  navigateTo(`/projects/${project.id}`)
}

const clearFilter = () => {
  statusFilter.value = null
  loadProjects()
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

const formatDate = (date) => {
  if (!date) return 'N/A'
  // Parse date string to avoid timezone issues
  // If it's a date string (YYYY-MM-DD), parse it as local date
  const dateStr = typeof date === 'string' ? date : date.toISOString()
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  
  if (dateMatch) {
    // Parse as local date to avoid timezone shift
    const year = parseInt(dateMatch[1], 10)
    const month = parseInt(dateMatch[2], 10) - 1 // Month is 0-indexed
    const day = parseInt(dateMatch[3], 10)
    const localDate = new Date(year, month, day)
    
    return localDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  // Fallback for full timestamp strings
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Initialize
onMounted(async () => {
  await Promise.all([
    loadProjects(),
    loadTemplates(),
    loadTanks()
  ])
})
</script>

