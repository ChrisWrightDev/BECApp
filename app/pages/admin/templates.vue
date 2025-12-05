<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-4xl font-bold mb-2">Template Management</h1>
        <p class="text-base-content/70">Create and manage project templates with phases and tasks</p>
      </div>
      <button @click="openTemplateModal" class="btn btn-primary">
        <Icon name="mdi:plus" class="w-5 h-5" />
        New Template
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

    <!-- Templates List -->
    <div v-else-if="templates.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="template in templates"
        :key="template.id"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
      >
        <div class="card-body">
          <div class="flex justify-between items-start mb-2">
            <h2 class="card-title">{{ template.name }}</h2>
            <div class="dropdown dropdown-end">
              <div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-circle">
                <Icon name="mdi:dots-vertical" class="w-5 h-5" />
              </div>
              <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                <li><a @click="openTemplateBuilder(template)">Edit Template</a></li>
                <li><a @click="deleteTemplateConfirm(template)" class="text-error">Delete</a></li>
              </ul>
            </div>
          </div>
          <p v-if="template.description" class="text-sm text-base-content/70 mb-4 line-clamp-2">
            {{ template.description }}
          </p>
          <div class="space-y-2 mb-4">
            <div class="flex items-center gap-2">
              <Icon name="mdi:tag" class="w-4 h-4 text-base-content/50" />
              <span class="text-sm text-base-content/70 capitalize">{{ template.type.replace('_', ' ') }}</span>
            </div>
          </div>
          <div class="card-actions">
            <button @click="openTemplateBuilder(template)" class="btn btn-primary btn-sm">
              <Icon name="mdi:pencil" class="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <Icon name="mdi:file-document-outline" class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <p class="text-lg text-base-content/70">No templates found</p>
        <p class="text-sm text-base-content/50 mt-2">
          Create your first template to get started
        </p>
        <button @click="openTemplateModal" class="btn btn-primary mt-4">
          Create Template
        </button>
      </div>
    </div>

    <!-- Create/Edit Template Modal -->
    <dialog ref="templateModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ editingTemplate && editingTemplate.id ? 'Edit Template' : 'Create New Template' }}
        </h3>
        <form @submit.prevent="handleTemplateSubmit" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Template Name *</span>
            </label>
            <input
              v-model="templateForm.name"
              type="text"
              placeholder="Enter template name"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Description</span>
            </label>
            <textarea
              v-model="templateForm.description"
              placeholder="Enter template description"
              class="textarea textarea-bordered"
              rows="3"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Template Type</span>
            </label>
            <input
              type="text"
              value="Lifecycle"
              class="input input-bordered"
              disabled
            />
            <label class="label">
              <span class="label-text-alt">Projects use lifecycle templates with phases. For recurring tasks, use Jobs instead.</span>
            </label>
          </div>

          <div class="modal-action">
            <button type="button" @click="closeTemplateModal" class="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
              {{ editingTemplate ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeTemplateModal">close</button>
      </form>
    </dialog>

    <!-- Template Builder Modal -->
    <dialog ref="builderModal" class="modal modal-max">
      <div class="modal-box max-w-6xl max-h-[90vh] overflow-y-auto">
        <h3 class="font-bold text-lg mb-4">
          {{ builderTemplate ? `Edit: ${builderTemplate.name}` : 'Template Builder' }}
        </h3>
        
        <div v-if="builderTemplate" class="space-y-6">
          <!-- Phases Section -->
          <div>
            <div class="flex justify-between items-center mb-4">
              <h4 class="text-xl font-semibold">Phases</h4>
              <button @click="openPhaseModal" class="btn btn-primary btn-sm">
                <Icon name="mdi:plus" class="w-4 h-4" />
                Add Phase
              </button>
            </div>
            <div class="divider"></div>
            <div v-if="builderPhases.length > 0" class="space-y-4" id="phases-list">
              <div
                v-for="(phase, index) in builderPhases"
                :key="phase.id || `temp-${index}`"
                class="card bg-base-200 cursor-move"
                :draggable="true"
                @dragstart="handleDragStart($event, index)"
                @dragover.prevent="handleDragOver($event, index)"
                @drop="handleDrop($event, index)"
                @dragend="handleDragEnd"
                :class="{ 'opacity-50': draggedPhaseIndex === index }"
              >
                <div class="card-body">
                  <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-2 flex-1">
                      <Icon name="mdi:drag" class="w-5 h-5 text-base-content/40 flex-shrink-0" />
                    <div>
                      <h5 class="font-semibold text-lg">
                        Phase {{ phase.order_index }}: {{ phase.name }}
                      </h5>
                      <p v-if="phase.description" class="text-sm text-base-content/70 mt-1">
                        {{ phase.description }}
                      </p>
                      <div v-if="phase.duration_days" class="text-sm text-base-content/60 mt-1">
                        Auto-advance after {{ phase.duration_days }} days
                        </div>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button
                        @click="openPhaseModal(phase)"
                        class="btn btn-ghost btn-sm"
                      >
                        <Icon name="mdi:pencil" class="w-4 h-4" />
                      </button>
                      <button
                        @click="deletePhaseConfirm(phase)"
                        class="btn btn-ghost btn-sm text-error"
                      >
                        <Icon name="mdi:delete" class="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <!-- Phase Tasks -->
                  <div>
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-sm font-semibold">Tasks</span>
                      <button
                        @click="openPhaseTaskModal(phase)"
                        class="btn btn-primary btn-xs"
                      >
                        <Icon name="mdi:plus" class="w-3 h-3" />
                        Add Task
                      </button>
                    </div>
                    <div v-if="getPhaseTasks(phase.id).length > 0" class="space-y-2">
                      <div
                        v-for="task in getPhaseTasks(phase.id)"
                        :key="task.id || `temp-${task.order_index}`"
                        class="flex items-center justify-between p-2 bg-base-100 rounded"
                      >
                        <div class="flex-1">
                          <div class="font-medium">{{ task.title }}</div>
                          <div class="text-xs text-base-content/60">
                            <span v-if="task.time_window" class="capitalize">{{ task.time_window }}</span>
                            <span v-if="task.scheduled_time" class="ml-2">{{ task.scheduled_time }}</span>
                            <span v-if="task.requires_notes" class="ml-2 badge badge-xs">Requires Notes</span>
                          </div>
                        </div>
                        <div class="flex gap-1">
                          <button
                            @click="openPhaseTaskModal(phase, task)"
                            class="btn btn-ghost btn-xs"
                          >
                            <Icon name="mdi:pencil" class="w-3 h-3" />
                          </button>
                          <button
                            @click="deletePhaseTaskConfirm(task)"
                            class="btn btn-ghost btn-xs text-error"
                          >
                            <Icon name="mdi:delete" class="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div v-else class="text-sm text-base-content/50 text-center py-2">
                      No tasks in this phase
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-base-content/70">
              No phases yet. Add your first phase to get started.
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

    <!-- Phase Modal -->
    <dialog ref="phaseModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ editingPhase ? 'Edit Phase' : 'Add Phase' }}
        </h3>
        <form @submit.prevent="handlePhaseSubmit" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Phase Name *</span>
            </label>
            <input
              v-model="phaseForm.name"
              type="text"
              placeholder="Enter phase name"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Description</span>
            </label>
            <textarea
              v-model="phaseForm.description"
              placeholder="Enter phase description"
              class="textarea textarea-bordered"
              rows="2"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Order Index *</span>
            </label>
            <input
              v-model.number="phaseForm.order_index"
              type="number"
              placeholder="Enter order (1, 2, 3...)"
              class="input input-bordered"
              min="1"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Duration (Days)</span>
              <span class="label-text-alt">Leave empty for manual advancement</span>
            </label>
            <input
              v-model.number="phaseForm.duration_days"
              type="number"
              placeholder="Auto-advance after N days"
              class="input input-bordered"
              min="1"
            />
          </div>

          <div class="modal-action">
            <button type="button" @click="closePhaseModal" class="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
              {{ editingPhase ? 'Update' : 'Add' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closePhaseModal">close</button>
      </form>
    </dialog>

    <!-- Phase Task Modal -->
    <dialog ref="phaseTaskModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ editingPhaseTask ? 'Edit Task' : 'Add Task' }}
        </h3>
        <form @submit.prevent="handlePhaseTaskSubmit" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Task Title *</span>
            </label>
            <input
              v-model="phaseTaskForm.title"
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
              v-model="phaseTaskForm.description"
              placeholder="Enter task description"
              class="textarea textarea-bordered"
              rows="2"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Time Window</span>
            </label>
            <select v-model="phaseTaskForm.time_window" class="select select-bordered">
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
              v-model="phaseTaskForm.scheduled_time"
              type="time"
              class="input input-bordered"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Order Index *</span>
            </label>
            <input
              v-model.number="phaseTaskForm.order_index"
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
                v-model="phaseTaskForm.requires_notes"
                type="checkbox"
                class="checkbox"
              />
            </label>
          </div>

          <div class="modal-action">
            <button type="button" @click="closePhaseTaskModal" class="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
              {{ editingPhaseTask ? 'Update' : 'Add' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closePhaseTaskModal">close</button>
      </form>
    </dialog>

    <!-- Delete Confirmations -->
    <dialog ref="deleteTemplateModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete Template</h3>
        <p class="mb-4">
          Are you sure you want to delete <strong>{{ templateToDelete?.name }}</strong>?
          This will also delete all associated phases and tasks. This action cannot be undone.
        </p>
        <div class="modal-action">
          <button @click="closeDeleteTemplateModal" class="btn btn-ghost">Cancel</button>
          <button @click="confirmDeleteTemplate" class="btn btn-error" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeleteTemplateModal">close</button>
      </form>
    </dialog>

    <dialog ref="deletePhaseModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete Phase</h3>
        <p class="mb-4">Are you sure you want to delete this phase? This will also delete all tasks in this phase.</p>
        <div class="modal-action">
          <button @click="closeDeletePhaseModal" class="btn btn-ghost">Cancel</button>
          <button @click="confirmDeletePhase" class="btn btn-error" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeletePhaseModal">close</button>
      </form>
    </dialog>

    <dialog ref="deletePhaseTaskModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete Task</h3>
        <p class="mb-4">Are you sure you want to delete this task?</p>
        <div class="modal-action">
          <button @click="closeDeletePhaseTaskModal" class="btn btn-ghost">Cancel</button>
          <button @click="confirmDeletePhaseTask" class="btn btn-error" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeletePhaseTaskModal">close</button>
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
  templates,
  loading,
  error,
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  fetchPhases,
  createPhase,
  updatePhase,
  deletePhase,
  fetchPhaseTasks,
  createPhaseTask,
  updatePhaseTask,
  deletePhaseTask
} = useProjects()
const { showSuccess, showError } = useNotifications()

const templateModal = ref(null)
const builderModal = ref(null)
const phaseModal = ref(null)
const phaseTaskModal = ref(null)
const deleteTemplateModal = ref(null)
const deletePhaseModal = ref(null)
const deletePhaseTaskModal = ref(null)

const editingTemplate = ref(null)
const editingPhase = ref(null)
const editingPhaseTask = ref(null)
const builderTemplate = ref(null)
const builderPhases = ref([])
const builderPhaseTasks = ref([])
const draggedPhaseIndex = ref(null)
const draggedOverIndex = ref(null)
const templateToDelete = ref(null)
const phaseToDelete = ref(null)
const phaseTaskToDelete = ref(null)
const submitting = ref(false)

const templateForm = ref({
  name: '',
  description: '',
  type: 'lifecycle'
})

const phaseForm = ref({
  template_id: null,
  name: '',
  description: '',
  order_index: 1,
  duration_days: null
})

const phaseTaskForm = ref({
  phase_id: null,
  title: '',
  description: '',
  time_window: null,
  scheduled_time: null,
  order_index: 1,
  requires_notes: false
})

// Methods
const loadTemplates = async () => {
  await fetchTemplates()
}

const openTemplateModal = (template = null) => {
  // Always reset editingTemplate first
  editingTemplate.value = null
  
  if (template && template.id) {
    // Editing existing template
    editingTemplate.value = template
    templateForm.value = {
      name: template.name,
      description: template.description || '',
      type: 'lifecycle'
    }
  } else {
    // Creating new template
    editingTemplate.value = null
    templateForm.value = {
      name: '',
      description: '',
      type: 'lifecycle'
    }
  }
  templateModal.value?.showModal()
}

const closeTemplateModal = () => {
  templateModal.value?.close()
  editingTemplate.value = null
}


const handleTemplateSubmit = async () => {
  submitting.value = true
  try {
    if (editingTemplate.value && editingTemplate.value.id) {
      const result = await updateTemplate(editingTemplate.value.id, templateForm.value)
      if (result.error) {
        throw result.error
      }
      showSuccess('Template updated successfully')
    } else {
      const result = await createTemplate(templateForm.value)
      if (result.error) {
        throw result.error
      }
      showSuccess('Template created successfully')
    }
    closeTemplateModal()
    await loadTemplates()
  } catch (err) {
    console.error('Error saving template:', err)
    const errorMessage = err?.message || err?.code || 'Unknown error'
    showError('Error saving template: ' + errorMessage)
  } finally {
    submitting.value = false
  }
}

const openTemplateBuilder = async (template) => {
  builderTemplate.value = template
  const { data } = await fetchPhases(template.id)
  builderPhases.value = data || []
  
  // Load tasks for all phases
  builderPhaseTasks.value = []
  for (const phase of builderPhases.value) {
    const { data: tasks } = await fetchPhaseTasks(phase.id)
    if (tasks) {
      builderPhaseTasks.value.push(...tasks)
    }
  }
  
  builderModal.value?.showModal()
}

const closeBuilderModal = () => {
  builderModal.value?.close()
  builderTemplate.value = null
  builderPhases.value = []
  builderPhaseTasks.value = []
}

const getPhaseTasks = (phaseId) => {
  return builderPhaseTasks.value.filter(t => t.phase_id === phaseId)
}

const openPhaseModal = (phase = null) => {
  editingPhase.value = phase
  if (phase) {
    phaseForm.value = {
      template_id: builderTemplate.value.id,
      name: phase.name,
      description: phase.description || '',
      order_index: phase.order_index,
      duration_days: phase.duration_days || null
    }
  } else {
    phaseForm.value = {
      template_id: builderTemplate.value.id,
      name: '',
      description: '',
      order_index: builderPhases.value.length + 1,
      duration_days: null
    }
  }
  phaseModal.value?.showModal()
}

const closePhaseModal = () => {
  phaseModal.value?.close()
  editingPhase.value = null
}

const handlePhaseSubmit = async () => {
  submitting.value = true
  try {
    if (editingPhase.value && editingPhase.value.id) {
      await updatePhase(editingPhase.value.id, phaseForm.value)
      showSuccess('Phase updated successfully')
    } else {
      const { data } = await createPhase(phaseForm.value)
      if (data) {
        builderPhases.value.push(data)
        showSuccess('Phase created successfully')
      }
    }
    closePhaseModal()
    // Reload phases to get updated data
    const { data } = await fetchPhases(builderTemplate.value.id)
    builderPhases.value = data || []
  } catch (err) {
    console.error('Error saving phase:', err)
    showError('Error saving phase: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const openPhaseTaskModal = (phase, task = null) => {
  editingPhaseTask.value = task
  if (task) {
    phaseTaskForm.value = {
      phase_id: phase.id,
      title: task.title,
      description: task.description || '',
      time_window: task.time_window || null,
      scheduled_time: task.scheduled_time || null,
      order_index: task.order_index,
      requires_notes: task.requires_notes || false
    }
  } else {
    const existingTasks = getPhaseTasks(phase.id)
    phaseTaskForm.value = {
      phase_id: phase.id,
      title: '',
      description: '',
      time_window: null,
      scheduled_time: null,
      order_index: existingTasks.length + 1,
      requires_notes: false
    }
  }
  phaseTaskModal.value?.showModal()
}

const closePhaseTaskModal = () => {
  phaseTaskModal.value?.close()
  editingPhaseTask.value = null
}

const handlePhaseTaskSubmit = async () => {
  submitting.value = true
  try {
    if (editingPhaseTask.value && editingPhaseTask.value.id) {
      await updatePhaseTask(editingPhaseTask.value.id, phaseTaskForm.value)
      showSuccess('Phase task updated successfully')
    } else {
      const { data } = await createPhaseTask(phaseTaskForm.value)
      if (data) {
        builderPhaseTasks.value.push(data)
        showSuccess('Phase task created successfully')
      }
    }
    closePhaseTaskModal()
    // Reload tasks for the phase
    const { data } = await fetchPhaseTasks(phaseTaskForm.value.phase_id)
    builderPhaseTasks.value = builderPhaseTasks.value.filter(t => t.phase_id !== phaseTaskForm.value.phase_id)
    if (data) {
      builderPhaseTasks.value.push(...data)
    }
  } catch (err) {
    console.error('Error saving phase task:', err)
    showError('Error saving phase task: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const deleteTemplateConfirm = (template) => {
  templateToDelete.value = template
  deleteTemplateModal.value?.showModal()
}

const closeDeleteTemplateModal = () => {
  deleteTemplateModal.value?.close()
  templateToDelete.value = null
}

const confirmDeleteTemplate = async () => {
  if (!templateToDelete.value) return
  submitting.value = true
  try {
    await deleteTemplate(templateToDelete.value.id)
    showSuccess('Template deleted successfully')
    closeDeleteTemplateModal()
    await loadTemplates()
  } catch (err) {
    console.error('Error deleting template:', err)
    showError('Error deleting template: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const deletePhaseConfirm = (phase) => {
  phaseToDelete.value = phase
  deletePhaseModal.value?.showModal()
}

const closeDeletePhaseModal = () => {
  deletePhaseModal.value?.close()
  phaseToDelete.value = null
}

const confirmDeletePhase = async () => {
  if (!phaseToDelete.value || !phaseToDelete.value.id) return
  submitting.value = true
  try {
    // Store the phase ID before closing the modal (which clears phaseToDelete.value)
    const phaseIdToDelete = phaseToDelete.value.id
    const supabase = useSupabaseClient()
    
    // Check if any projects are using this phase
    const { data: projectsUsingPhase, error: checkError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('current_phase_id', phaseIdToDelete)
    
    if (checkError) throw checkError
    
    // If projects are using this phase, update them to use the first phase of the template (or null)
    if (projectsUsingPhase && projectsUsingPhase.length > 0) {
      // Get the first phase of the template (excluding the one we're deleting)
      const { data: otherPhases } = await supabase
        .from('phases')
        .select('id')
        .eq('template_id', builderTemplate.value.id)
        .neq('id', phaseIdToDelete)
        .order('order_index', { ascending: true })
        .limit(1)
      
      const newPhaseId = otherPhases && otherPhases.length > 0 ? otherPhases[0].id : null
      
      // Update all projects using this phase
      const { error: updateError } = await supabase
        .from('projects')
        .update({ current_phase_id: newPhaseId })
        .eq('current_phase_id', phaseIdToDelete)
      
      if (updateError) throw updateError
      
      if (newPhaseId) {
        showSuccess(`Phase deleted. ${projectsUsingPhase.length} project(s) moved to the next available phase.`)
      } else {
        showSuccess(`Phase deleted. ${projectsUsingPhase.length} project(s) had their phase cleared (no other phases available).`)
      }
    }
    
    // Now delete the phase
    const result = await deletePhase(phaseIdToDelete)
    if (result.error) {
      throw result.error
    }
    
    if (!projectsUsingPhase || projectsUsingPhase.length === 0) {
    showSuccess('Phase deleted successfully')
    }
    
    closeDeletePhaseModal()
    // Reload phases
    const { data } = await fetchPhases(builderTemplate.value.id)
    builderPhases.value = data || []
    // Remove tasks for deleted phase
    builderPhaseTasks.value = builderPhaseTasks.value.filter(t => t.phase_id !== phaseIdToDelete)
  } catch (err) {
    console.error('Error deleting phase:', err)
    // Provide a more user-friendly error message
    if (err.code === '23503') {
      showError('Cannot delete phase: It is still being used by one or more projects. Please update those projects first.')
    } else {
    showError('Error deleting phase: ' + (err.message || 'Unknown error'))
    }
  } finally {
    submitting.value = false
  }
}

const deletePhaseTaskConfirm = (task) => {
  phaseTaskToDelete.value = task
  deletePhaseTaskModal.value?.showModal()
}

const closeDeletePhaseTaskModal = () => {
  deletePhaseTaskModal.value?.close()
  phaseTaskToDelete.value = null
}

const confirmDeletePhaseTask = async () => {
  if (!phaseTaskToDelete.value || !phaseTaskToDelete.value.id) return
  submitting.value = true
  try {
    await deletePhaseTask(phaseTaskToDelete.value.id)
    showSuccess('Phase task deleted successfully')
    closeDeletePhaseTaskModal()
    // Remove from local state
    builderPhaseTasks.value = builderPhaseTasks.value.filter(t => t.id !== phaseTaskToDelete.value.id)
  } catch (err) {
    console.error('Error deleting phase task:', err)
    showError('Error deleting phase task: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

// Initialize
onMounted(async () => {
  await loadTemplates()
})
</script>

<style scoped>
.modal-max {
  max-width: 90vw;
}
</style>

