<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-4xl font-bold mb-2">Job Management</h1>
        <p class="text-base-content/70">Create and manage recurring jobs with intervals</p>
      </div>
      <button @click="openJobModal" class="btn btn-primary">
        <Icon name="mdi:plus" class="w-5 h-5" />
        New Job
      </button>
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

    <!-- Jobs List -->
    <div v-else-if="jobs.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="job in jobs"
        :key="job.id"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
      >
        <div class="card-body">
          <div class="flex justify-between items-start mb-2">
            <h2 class="card-title">{{ job.name }}</h2>
            <div class="dropdown dropdown-end">
              <div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-circle">
                <Icon name="mdi:dots-vertical" class="w-5 h-5" />
              </div>
              <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                <li><a @click="openJobModal(job)">Edit Job Details</a></li>
                <li><a @click="openJobBuilder(job)">Edit Job Tasks</a></li>
                <li><a @click="deleteJobConfirm(job)" class="text-error">Delete</a></li>
              </ul>
            </div>
          </div>
          <p v-if="job.description" class="text-sm text-base-content/70 mb-4 line-clamp-2">
            {{ job.description }}
          </p>
          <div class="space-y-2 mb-4">
            <div class="flex items-center gap-2">
              <Icon name="mdi:calendar-repeat" class="w-4 h-4 text-base-content/50" />
              <span class="text-sm text-base-content/70">Every {{ job.interval_days }} day{{ job.interval_days !== 1 ? 's' : '' }}</span>
            </div>
            <div v-if="job.tank_name" class="flex items-center gap-2">
              <Icon name="mdi:water" class="w-4 h-4 text-base-content/50" />
              <span class="text-sm text-base-content/70">{{ job.tank_name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Icon name="mdi:tag" class="w-4 h-4 text-base-content/50" />
              <span class="text-sm text-base-content/70 capitalize">{{ job.status }}</span>
            </div>
            <div v-if="job.requires_sequential" class="flex items-center gap-2">
              <Icon name="mdi:order-sequential" class="w-4 h-4 text-base-content/50" />
              <span class="text-sm text-base-content/70">Sequential task completion required</span>
            </div>
          </div>
          <div class="card-actions">
            <button @click="openJobModal(job)" class="btn btn-primary btn-sm">
              <Icon name="mdi:pencil" class="w-4 h-4" />
              Edit
            </button>
            <button @click="openJobBuilder(job)" class="btn btn-ghost btn-sm">
              <Icon name="mdi:format-list-checks" class="w-4 h-4" />
              Edit Tasks
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <Icon name="mdi:briefcase-outline" class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <p class="text-lg text-base-content/70">No jobs found</p>
        <p class="text-sm text-base-content/50 mt-2">
          Create your first job to get started
        </p>
        <button @click="openJobModal" class="btn btn-primary mt-4">
          Create Job
        </button>
      </div>
    </div>

    <!-- Create/Edit Job Modal -->
    <dialog ref="jobModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ editingJob && editingJob.id ? 'Edit Job' : 'Create New Job' }}
        </h3>
        <form @submit.prevent="handleJobSubmit" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Job Name *</span>
            </label>
            <input
              v-model="jobForm.name"
              type="text"
              placeholder="Enter job name"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Description</span>
            </label>
            <textarea
              v-model="jobForm.description"
              placeholder="Enter job description"
              class="textarea textarea-bordered"
              rows="3"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Interval (Days) *</span>
              <span class="label-text-alt">How often to perform this job</span>
            </label>
            <input
              v-model.number="jobForm.interval_days"
              type="number"
              placeholder="Enter interval in days (e.g., 1 for daily, 7 for weekly)"
              class="input input-bordered"
              min="1"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Tank</span>
              <span class="label-text-alt">Optional</span>
            </label>
            <select
              v-model="jobForm.tank_id"
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
            <label class="label cursor-pointer">
              <span class="label-text">Require Sequential Task Completion</span>
              <input
                v-model="jobForm.requires_sequential"
                type="checkbox"
                class="toggle toggle-primary"
              />
            </label>
            <label class="label">
              <span class="label-text-alt">If enabled, tasks in this job must be completed in order</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Status *</span>
            </label>
            <select
              v-model="jobForm.status"
              class="select select-bordered"
              required
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div class="modal-action">
            <button type="button" @click="closeJobModal" class="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
              {{ editingJob ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeJobModal">close</button>
      </form>
    </dialog>

    <!-- Job Builder Modal -->
    <dialog ref="builderModal" class="modal modal-max">
      <div class="modal-box max-w-6xl max-h-[90vh] overflow-y-auto">
        <h3 class="font-bold text-lg mb-4">
          {{ builderJob ? `Edit: ${builderJob.name}` : 'Job Builder' }}
        </h3>
        
        <div v-if="builderJob" class="space-y-6">
          <!-- Job Info -->
          <div class="card bg-base-200">
            <div class="card-body">
              <h4 class="text-lg font-semibold mb-2">Job Information</h4>
              <div class="space-y-2">
                <div>
                  <span class="font-medium">Interval:</span>
                  <span class="ml-2">Every {{ builderJob.interval_days }} day{{ builderJob.interval_days !== 1 ? 's' : '' }}</span>
                </div>
                <div>
                  <span class="font-medium">Status:</span>
                  <span class="ml-2 capitalize">{{ builderJob.status }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tasks Section -->
          <div>
            <div class="flex justify-between items-center mb-4">
              <h4 class="text-xl font-semibold">Tasks</h4>
              <button @click="openJobTaskModal" class="btn btn-primary btn-sm">
                <Icon name="mdi:plus" class="w-4 h-4" />
                Add Task
              </button>
            </div>
            <div class="divider"></div>
            <div v-if="builderJobTasks.length > 0" class="space-y-2">
              <div
                v-for="(task, index) in builderJobTasks"
                :key="task.id || `temp-${index}`"
                class="flex items-center justify-between p-4 bg-base-200 rounded-lg"
              >
                <div class="flex-1">
                  <div class="font-medium text-lg">{{ task.title }}</div>
                  <div v-if="task.description" class="text-sm text-base-content/70 mt-1">
                    {{ task.description }}
                  </div>
                  <div class="text-xs text-base-content/60 mt-2 flex gap-2">
                    <span v-if="task.time_window" class="capitalize">{{ task.time_window }}</span>
                    <span v-if="task.scheduled_time">{{ task.scheduled_time }}</span>
                    <span v-if="task.requires_notes" class="badge badge-xs">Requires Notes</span>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button
                    @click="openJobTaskModal(task)"
                    class="btn btn-ghost btn-sm"
                  >
                    <Icon name="mdi:pencil" class="w-4 h-4" />
                  </button>
                  <button
                    @click="deleteJobTaskConfirm(task)"
                    class="btn btn-ghost btn-sm text-error"
                  >
                    <Icon name="mdi:delete" class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-base-content/70">
              No tasks yet. Add your first task to get started.
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button @click="closeBuilderModal" class="btn">Close</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeBuilderModal">close</button>
      </form>
    </dialog>

    <!-- Job Task Modal -->
    <dialog ref="jobTaskModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ editingJobTask ? 'Edit Task' : 'Add Task' }}
        </h3>
        <form @submit.prevent="handleJobTaskSubmit" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Task Title *</span>
            </label>
            <input
              v-model="jobTaskForm.title"
              type="text"
              placeholder="Enter task title"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Description</span>
            </label>
            <textarea
              v-model="jobTaskForm.description"
              placeholder="Enter task description"
              class="textarea textarea-bordered"
              rows="2"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Time Window</span>
            </label>
            <select v-model="jobTaskForm.time_window" class="select select-bordered">
              <option :value="null">No specific time</option>
              <option value="first">First</option>
              <option value="morning">Morning</option>
              <option value="midday">Midday</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="last">Last</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Scheduled Time</span>
            </label>
            <input
              v-model="jobTaskForm.scheduled_time"
              type="time"
              class="input input-bordered"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Order Index *</span>
            </label>
            <input
              v-model.number="jobTaskForm.order_index"
              type="number"
              placeholder="Enter order (1, 2, 3...)"
              class="input input-bordered"
              min="1"
              required
            />
          </div>

          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text">Requires Notes</span>
              <input
                v-model="jobTaskForm.requires_notes"
                type="checkbox"
                class="checkbox"
              />
            </label>
          </div>

          <div class="modal-action">
            <button type="button" @click="closeJobTaskModal" class="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
              {{ editingJobTask ? 'Update' : 'Add' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeJobTaskModal">close</button>
      </form>
    </dialog>

    <!-- Delete Confirmations -->
    <dialog ref="deleteJobModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete Job</h3>
        <p class="mb-4">
          Are you sure you want to delete <strong>{{ jobToDelete?.name }}</strong>?
          This will also delete all associated tasks. This action cannot be undone.
        </p>
        <div class="modal-action">
          <button @click="closeDeleteJobModal" class="btn btn-ghost">Cancel</button>
          <button @click="confirmDeleteJob" class="btn btn-error" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeleteJobModal">close</button>
      </form>
    </dialog>

    <dialog ref="deleteJobTaskModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete Task</h3>
        <p class="mb-4">Are you sure you want to delete this task?</p>
        <div class="modal-action">
          <button @click="closeDeleteJobTaskModal" class="btn btn-ghost">Cancel</button>
          <button @click="confirmDeleteJobTask" class="btn btn-error" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeleteJobTaskModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const {
  jobs,
  loading,
  error,
  fetchJobs,
  createJob,
  updateJob,
  deleteJob,
  fetchJobTasks,
  createJobTask,
  updateJobTask,
  deleteJobTask
} = useJobs()
const {
  tanks,
  activeTanks,
  fetchTanks
} = usePairs()
const { showSuccess, showError } = useNotifications()

const jobModal = ref(null)
const builderModal = ref(null)
const jobTaskModal = ref(null)
const deleteJobModal = ref(null)
const deleteJobTaskModal = ref(null)

const editingJob = ref(null)
const editingJobTask = ref(null)
const builderJob = ref(null)
const builderJobTasks = ref([])
const jobToDelete = ref(null)
const jobTaskToDelete = ref(null)
const submitting = ref(false)
const loadingTanks = ref(false)

const jobForm = ref({
  name: '',
  description: '',
  interval_days: 1,
  tank_id: null,
  status: 'active',
  requires_sequential: false
})

const jobTaskForm = ref({
  job_id: null,
  title: '',
  description: '',
  time_window: null,
  scheduled_time: null,
  order_index: 1,
  requires_notes: false
})

// Methods
const loadJobs = async () => {
  await fetchJobs()
}

const openJobModal = async (job = null) => {
  editingJob.value = null
  
  // Load tanks before opening modal
  loadingTanks.value = true
  await fetchTanks({ status: 'active' })
  loadingTanks.value = false
  
  if (job && job.id) {
    editingJob.value = job
    jobForm.value = {
      name: job.name,
      description: job.description || '',
      interval_days: job.interval_days,
      tank_id: job.tank_id || null,
      status: job.status,
      requires_sequential: job.requires_sequential || false
    }
  } else {
    editingJob.value = null
    jobForm.value = {
      name: '',
      description: '',
      interval_days: 1,
      tank_id: null,
      status: 'active',
      requires_sequential: false
    }
  }
  jobModal.value?.showModal()
}

const closeJobModal = () => {
  jobModal.value?.close()
  editingJob.value = null
}

const handleJobSubmit = async () => {
  submitting.value = true
  try {
    if (editingJob.value && editingJob.value.id) {
      const result = await updateJob(editingJob.value.id, jobForm.value)
      if (result.error) {
        throw result.error
      }
      showSuccess('Job updated successfully')
    } else {
      const result = await createJob(jobForm.value)
      if (result.error) {
        throw result.error
      }
      showSuccess('Job created successfully')
    }
    closeJobModal()
    await loadJobs()
  } catch (err) {
    console.error('Error saving job:', err)
    const errorMessage = err?.message || err?.code || 'Unknown error'
    showError('Error saving job: ' + errorMessage)
  } finally {
    submitting.value = false
  }
}

const openJobBuilder = async (job) => {
  // Set the job first so the modal can display it immediately
  builderJob.value = job
  builderJobTasks.value = []
  
  // Open the modal immediately - don't wait for data fetching
  // This ensures the modal opens even if there are errors or no tasks
  builderModal.value?.showModal()
  
  // Then fetch additional data in the background
  try {
    // Fetch full job data with tank info if not already loaded
    if (!job.tank_name && job.tank_id) {
      try {
        const { data: jobData, error: jobError } = await fetchJobById(job.id)
        if (!jobError && jobData) {
          builderJob.value = jobData
        }
      } catch (err) {
        console.warn('Could not fetch full job data, using provided job:', err)
      }
    }
    
    // Fetch job tasks (will be empty array if none exist)
    try {
      const { data, error: tasksError } = await fetchJobTasks(job.id)
      if (!tasksError) {
        builderJobTasks.value = data || []
      }
    } catch (err) {
      console.warn('Could not fetch job tasks:', err)
    }
  } catch (err) {
    console.error('Error fetching job data:', err)
    // Modal is already open, so we can continue
  }
}

const closeBuilderModal = () => {
  builderModal.value?.close()
  builderJob.value = null
  builderJobTasks.value = []
}

const openJobTaskModal = (task = null) => {
  editingJobTask.value = task
  if (task) {
    jobTaskForm.value = {
      job_id: builderJob.value.id,
      title: task.title,
      description: task.description || '',
      time_window: task.time_window || null,
      scheduled_time: task.scheduled_time || null,
      order_index: task.order_index,
      requires_notes: task.requires_notes || false
    }
  } else {
    // Calculate the next order_index: use max + 1, or 1 if no tasks exist
    const maxOrderIndex = builderJobTasks.value.length > 0
      ? Math.max(...builderJobTasks.value.map(t => t.order_index || 0))
      : 0
    
    jobTaskForm.value = {
      job_id: builderJob.value.id,
      title: '',
      description: '',
      time_window: null,
      scheduled_time: null,
      order_index: maxOrderIndex + 1,
      requires_notes: false
    }
  }
  jobTaskModal.value?.showModal()
}

const closeJobTaskModal = () => {
  jobTaskModal.value?.close()
  editingJobTask.value = null
}

const handleJobTaskSubmit = async () => {
  submitting.value = true
  try {
    if (editingJobTask.value && editingJobTask.value.id) {
      await updateJobTask(editingJobTask.value.id, jobTaskForm.value)
      showSuccess('Job task updated successfully')
    } else {
      const { data } = await createJobTask(jobTaskForm.value)
      if (data) {
        builderJobTasks.value.push(data)
        showSuccess('Job task created successfully')
      }
    }
    closeJobTaskModal()
    // Reload tasks
    const { data } = await fetchJobTasks(builderJob.value.id)
    builderJobTasks.value = data || []
  } catch (err) {
    console.error('Error saving job task:', err)
    showError('Error saving job task: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const deleteJobConfirm = (job) => {
  jobToDelete.value = job
  deleteJobModal.value?.showModal()
}

const closeDeleteJobModal = () => {
  deleteJobModal.value?.close()
  jobToDelete.value = null
}

const confirmDeleteJob = async () => {
  if (!jobToDelete.value) return
  submitting.value = true
  try {
    await deleteJob(jobToDelete.value.id)
    showSuccess('Job deleted successfully')
    closeDeleteJobModal()
    await loadJobs()
  } catch (err) {
    console.error('Error deleting job:', err)
    showError('Error deleting job: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const deleteJobTaskConfirm = (task) => {
  jobTaskToDelete.value = task
  deleteJobTaskModal.value?.showModal()
}

const closeDeleteJobTaskModal = () => {
  deleteJobTaskModal.value?.close()
  jobTaskToDelete.value = null
}

const confirmDeleteJobTask = async () => {
  if (!jobTaskToDelete.value || !jobTaskToDelete.value.id) return
  submitting.value = true
  try {
    await deleteJobTask(jobTaskToDelete.value.id)
    showSuccess('Job task deleted successfully')
    closeDeleteJobTaskModal()
    // Remove from local state
    builderJobTasks.value = builderJobTasks.value.filter(t => t.id !== jobTaskToDelete.value.id)
  } catch (err) {
    console.error('Error deleting job task:', err)
    showError('Error deleting job task: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

// Initialize
onMounted(async () => {
  await loadJobs()
})
</script>

<style scoped>
.modal-max {
  max-width: 90vw;
}
</style>

