<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-4xl font-bold mb-2">Projects</h1>
        <p class="text-base-content/70">Manage your aquaculture projects</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        <Icon name="mdi:plus" class="w-5 h-5" />
        New Project
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="flex flex-wrap gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Status</span>
            </label>
            <select
              v-model="statusFilter"
              class="select select-bordered"
              @change="loadProjects"
            >
              <option :value="null">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div class="form-control flex items-end">
            <button @click="clearFilter" class="btn btn-ghost">
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
    <div v-else-if="displayProjects.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="project in displayProjects"
        :key="project.id"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
      >
        <div class="card-body">
          <div class="flex justify-between items-start mb-2">
            <h2 class="card-title">{{ project.name }}</h2>
            <div class="dropdown dropdown-end">
              <div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-circle">
                <Icon name="mdi:dots-vertical" class="w-5 h-5" />
              </div>
              <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                <li><a @click="openEditModal(project)">Edit</a></li>
                <li><a @click="viewProjectDetails(project)">View Details</a></li>
                <li><a @click="deleteProjectConfirm(project)" class="text-error">Delete</a></li>
              </ul>
            </div>
          </div>
          <p v-if="project.description" class="text-sm text-base-content/70 mb-4 line-clamp-2">
            {{ project.description }}
          </p>
          <div class="space-y-2 mb-4">
            <div class="flex items-center gap-2">
              <Icon name="mdi:file-document-outline" class="w-4 h-4 text-base-content/50" />
              <span class="text-sm text-base-content/70">{{ project.template_name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Icon name="mdi:chart-timeline-variant" class="w-4 h-4 text-base-content/50" />
              <span class="text-sm text-base-content/70">Phase: {{ project.current_phase }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Icon name="mdi:calendar-start" class="w-4 h-4 text-base-content/50" />
              <span class="text-sm text-base-content/70">
                Started: {{ formatDate(project.started_at) }}
              </span>
            </div>
          </div>
          <div class="card-actions justify-between items-center">
            <span class="badge" :class="getStatusBadgeClass(project.status)">
              {{ project.status }}
            </span>
            <NuxtLink :to="`/projects/${project.id}`" class="btn btn-primary btn-sm">
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
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ editingProject ? 'Edit Project' : 'Create New Project' }}
        </h3>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Project Name *</span>
            </label>
            <input
              v-model="projectForm.name"
              type="text"
              placeholder="Enter project name"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Description</span>
            </label>
            <textarea
              v-model="projectForm.description"
              placeholder="Enter project description"
              class="textarea textarea-bordered"
              rows="3"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Template *</span>
            </label>
            <select
              v-model="projectForm.template_id"
              class="select select-bordered"
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
            <label class="label">
              <span class="label-text">Tank</span>
            </label>
            <select
              v-model="projectForm.tank_id"
              class="select select-bordered"
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
            <label class="label">
              <span class="label-text">Status</span>
            </label>
            <select v-model="projectForm.status" class="select select-bordered">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div class="modal-action">
            <button type="button" @click="closeModal" class="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
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
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete Project</h3>
        <p class="mb-4">
          Are you sure you want to delete <strong>{{ projectToDelete?.name }}</strong>?
          This action cannot be undone.
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
  status: 'active'
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
    status: 'active'
  }
  await Promise.all([loadTemplates(), loadTanks()])
  projectModal.value?.showModal()
}

const openEditModal = async (project) => {
  editingProject.value = project
  projectForm.value = {
    name: project.name,
    description: project.description || '',
    template_id: project.template_id,
    tank_id: project.tank_id || null,
    status: project.status
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
      await updateProject(editingProject.value.id, projectForm.value)
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

