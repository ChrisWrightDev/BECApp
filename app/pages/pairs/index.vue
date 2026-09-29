<template>
  <div>
    <div class="page-header">
      <h1>Pairs</h1>
      <p>Track mated pairs and legacy clutches</p>
      <div class="flex gap-2 mt-3">
        <button @click="openTankModal" class="btn btn-outline btn-sm flex-1">
          <Icon name="mdi:water" class="w-4 h-4" />
          Tanks
        </button>
        <button @click="openPairModal" class="btn btn-primary btn-sm flex-1">
          <Icon name="mdi:plus" class="w-4 h-4" />
          New Pair
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-md mb-4">
      <div class="card-body p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div class="form-control w-full sm:w-auto sm:min-w-[150px]">
            <label class="label py-1 sm:py-2">
              <span class="label-text text-sm sm:text-base">Status</span>
            </label>
            <select
              v-model="statusFilter"
              class="select select-bordered w-full text-sm sm:text-base"
              @change="loadPairs"
            >
              <option :value="null">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div class="form-control w-full sm:w-auto sm:min-w-[150px]">
            <label class="label py-1 sm:py-2">
              <span class="label-text text-sm sm:text-base">Tank</span>
            </label>
            <select
              v-model="tankFilter"
              class="select select-bordered w-full text-sm sm:text-base"
              @change="loadPairs"
            >
              <option :value="null">All Tanks</option>
              <option
                v-for="tank in activeTanks"
                :key="tank.id"
                :value="tank.id"
              >
                {{ tank.name }}
              </option>
            </select>
          </div>
          <div class="form-control flex items-end w-full sm:w-auto">
            <button @click="clearFilters" class="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto">
              Clear Filters
            </button>
          </div>
        </div>
      </div>
    </div>

    <PageLoadState
      :loading="loading"
      :error="error"
      :empty="displayPairs.length === 0"
      empty-icon="mdi:fish"
      empty-title="No mated pairs found"
      empty-description="Create your first mated pair to get started"
      @retry="retry"
    >
      <template #empty-action>
        <button @click="openPairModal" class="btn btn-primary mt-4">
          Create Pair
        </button>
      </template>
    <!-- Pairs Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      <div
        v-for="pair in displayPairs"
        :key="pair.id"
        class="card bg-base-100 shadow-md"
      >
        <div class="card-body p-4 sm:p-6">
          <div class="flex justify-between items-start mb-2 gap-2">
            <h2 class="card-title text-base sm:text-lg flex-1 min-w-0 break-words">
              {{ pair.male_species || 'Unknown' }} × {{ pair.female_species || 'Unknown' }}
            </h2>
            <div class="dropdown dropdown-end flex-shrink-0">
              <div tabindex="0" role="button" class="btn btn-ghost btn-xs sm:btn-sm btn-circle">
                <Icon name="mdi:dots-vertical" class="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                <li><a @click="openPairModal(pair)">Edit</a></li>
                <li><a @click="viewHatches(pair)" class="text-info">View Legacy Clutches</a></li>
                <li><a @click="deletePairConfirm(pair)" class="text-error">Delete</a></li>
              </ul>
            </div>
          </div>

          <div class="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
            <div class="flex items-center gap-2">
              <Icon name="mdi:water" class="w-3 h-3 sm:w-4 sm:h-4 text-base-content/50 flex-shrink-0" />
              <span class="text-xs sm:text-sm text-base-content/70 truncate">{{ pair.tank_name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Icon name="mdi:calendar" class="w-3 h-3 sm:w-4 sm:h-4 text-base-content/50 flex-shrink-0" />
              <span class="text-xs sm:text-sm text-base-content/70 truncate">
                Paired: {{ pair.paired_date ? formatDate(pair.paired_date) : 'Not set' }}
              </span>
            </div>
            <div v-if="pairHatches(pair.id).length > 0" class="flex items-center gap-2">
              <Icon name="mdi:egg" class="w-3 h-3 sm:w-4 sm:h-4 text-base-content/50 flex-shrink-0" />
              <span class="text-xs sm:text-sm text-base-content/70">
                {{ pairHatches(pair.id).length }} clutch{{ pairHatches(pair.id).length !== 1 ? 'es' : '' }} (legacy)
              </span>
            </div>
          </div>

          <div v-if="pair.notes" class="text-xs sm:text-sm text-base-content/60 mb-3 sm:mb-4 line-clamp-2 break-words">
            {{ pair.notes }}
          </div>

          <div class="card-actions justify-between items-center flex-wrap gap-2">
            <span class="badge badge-sm sm:badge-md" :class="getStatusBadgeClass(pair.status)">
              {{ pair.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
    </PageLoadState>

    <!-- Create/Edit Pair Modal -->
    <dialog ref="pairModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ editingPair && editingPair.id ? 'Edit Mated Pair' : 'Create New Mated Pair' }}
        </h3>
        <form @submit.prevent="handlePairSubmit" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Male Species *</span>
            </label>
            <input
              v-model="pairForm.male_species"
              type="text"
              placeholder="Enter male species"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Female Species *</span>
            </label>
            <input
              v-model="pairForm.female_species"
              type="text"
              placeholder="Enter female species"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Tank</span>
            </label>
            <select
              v-model="pairForm.tank_id"
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
              <span class="label-text">Paired Date</span>
            </label>
            <input
              v-model="pairForm.paired_date"
              type="date"
              class="input input-bordered"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Status</span>
            </label>
            <select v-model="pairForm.status" class="select select-bordered">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Notes</span>
            </label>
            <textarea
              v-model="pairForm.notes"
              placeholder="Enter any notes"
              class="textarea textarea-bordered"
              rows="3"
            />
          </div>

          <div class="modal-action">
            <button type="button" @click="closePairModal" class="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
              {{ editingPair ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closePairModal">close</button>
      </form>
    </dialog>


    <!-- View Hatches Modal -->
    <dialog ref="hatchesViewModal" class="modal">
      <div class="modal-box">
        <div class="alert alert-warning mb-4">
          <Icon name="mdi:alert" class="w-5 h-5" />
          <div class="text-sm">
            <p class="font-semibold">Legacy Clutch Records (Read-Only)</p>
            <p>The hatches table is deprecated. Use hatch_batches for new clutch records.</p>
          </div>
        </div>
        <h3 class="font-bold text-lg mb-4">Legacy Clutch Records</h3>
        <div v-if="selectedPair" class="mb-4">
          <p class="text-sm text-base-content/70">
            Pair: <strong>{{ selectedPair.male_species }} × {{ selectedPair.female_species }}</strong>
          </p>
        </div>
        <div class="divider"></div>
        <div v-if="viewingHatches.length > 0" class="space-y-2 max-h-96 overflow-y-auto">
          <div
            v-for="hatch in viewingHatches"
            :key="hatch.id"
            class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
          >
            <div>
              <div class="font-semibold">{{ formatDate(hatch.hatch_date) }}</div>
              <div class="text-sm text-base-content/70">
                <span v-if="hatch.quantity">Quantity: {{ hatch.quantity }}</span>
                <span v-else>Quantity: Not specified</span>
              </div>
              <div v-if="hatch.notes" class="text-sm text-base-content/60 mt-1">
                {{ hatch.notes }}
              </div>
            </div>
            <div class="flex gap-2">
              <span class="badge badge-sm">Read-only</span>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8 text-base-content/70">
          No clutches recorded for this pair
        </div>
        <div class="modal-action">
          <button @click="closeHatchesViewModal" class="btn">Close</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeHatchesViewModal">close</button>
      </form>
    </dialog>

    <!-- Tank Management Modal -->
    <dialog ref="tankModal" class="modal">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Manage Tanks</h3>
        <div class="divider"></div>
        
        <!-- Tanks List -->
        <div class="space-y-2 mb-4 max-h-96 overflow-y-auto">
          <div
            v-for="tank in activeTanks"
            :key="tank.id"
            class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
          >
            <div>
              <div class="font-semibold">{{ tank.name }}</div>
              <div class="text-sm text-base-content/70">
                <span v-if="tank.capacity_gallons">Capacity: {{ tank.capacity_gallons }} gal</span>
                <span v-else>No capacity specified</span>
              </div>
              <div v-if="tank.description" class="text-sm text-base-content/60 mt-1">
                {{ tank.description }}
              </div>
            </div>
            <div class="flex gap-2">
              <button
                @click="openTankEditModal(tank)"
                class="btn btn-ghost btn-sm"
              >
                <Icon name="mdi:pencil" class="w-4 h-4" />
              </button>
              <button
                @click="deleteTankConfirm(tank)"
                class="btn btn-ghost btn-sm text-error"
              >
                <Icon name="mdi:delete" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button @click="closeTankModal" class="btn btn-ghost">Close</button>
          <button @click="openTankEditModal()" class="btn btn-primary">
            <Icon name="mdi:plus" class="w-5 h-5" />
            New Tank
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeTankModal">close</button>
      </form>
    </dialog>

    <!-- Create/Edit Tank Modal -->
    <dialog ref="tankEditModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ editingTank ? 'Edit Tank' : 'Create New Tank' }}
        </h3>
        <form @submit.prevent="handleTankSubmit" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Tank Name *</span>
            </label>
            <input
              v-model="tankForm.name"
              type="text"
              placeholder="Enter tank name"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Capacity (Gallons)</span>
            </label>
            <input
              v-model.number="tankForm.capacity_gallons"
              type="number"
              placeholder="Enter capacity"
              class="input input-bordered"
              min="0"
              step="0.01"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Status</span>
            </label>
            <select v-model="tankForm.status" class="select select-bordered">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Description</span>
            </label>
            <textarea
              v-model="tankForm.description"
              placeholder="Enter description"
              class="textarea textarea-bordered"
              rows="3"
            />
          </div>

          <div class="modal-action">
            <button type="button" @click="closeTankEditModal" class="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
              {{ editingTank ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeTankEditModal">close</button>
      </form>
    </dialog>

    <!-- Delete Confirmations -->
    <dialog ref="deletePairModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete Mated Pair</h3>
        <p class="mb-4">
          Are you sure you want to delete this pair? This will also delete all associated clutches.
          This action cannot be undone.
        </p>
        <div class="modal-action">
          <button @click="closeDeletePairModal" class="btn btn-ghost">Cancel</button>
          <button @click="confirmDeletePair" class="btn btn-error" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeletePairModal">close</button>
      </form>
    </dialog>

    <dialog ref="deleteTankModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete Tank</h3>
        <p class="mb-4">Are you sure you want to delete this tank? This action cannot be undone.</p>
        <div class="modal-action">
          <button @click="closeDeleteTankModal" class="btn btn-ghost">Cancel</button>
          <button @click="confirmDeleteTank" class="btn btn-error" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeleteTankModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { showSuccess, showError } = useNotifications()

const {
  tanks,
  matedPairs,
  hatches,
  activeTanks,
  activePairs,
  hatchesByPair,
  fetchTanks,
  fetchPairs,
  fetchHatches,
  createTank,
  updateTank,
  deleteTank,
  createPair,
  updatePair,
  deletePair,
  createHatch,
  updateHatch,
  deleteHatch
} = usePairs()

const statusFilter = ref(null)
const tankFilter = ref(null)
const submitting = ref(false)
const loadingTanks = ref(false)

const pairModal = ref(null)
const hatchesViewModal = ref(null)
const tankModal = ref(null)
const tankEditModal = ref(null)
const deletePairModal = ref(null)
const deleteTankModal = ref(null)

const editingPair = ref(null)
const editingTank = ref(null)
const selectedPair = ref(null)
const pairToDelete = ref(null)
const tankToDelete = ref(null)

const pairForm = ref({
  male_species: '',
  female_species: '',
  tank_id: null,
  paired_date: null,
  status: 'active',
  notes: ''
})

const tankForm = ref({
  name: '',
  capacity_gallons: null,
  status: 'active',
  description: ''
})

// Computed
const displayPairs = computed(() => {
  let result = [...matedPairs.value]
  
  if (statusFilter.value) {
    result = result.filter(p => p.status === statusFilter.value)
  }
  
  if (tankFilter.value) {
    result = result.filter(p => p.tank_id === tankFilter.value)
  }
  
  return result
})

const viewingHatches = computed(() => {
  if (!selectedPair.value) return []
  return hatches.value.filter(h => h.pair_id === selectedPair.value.id)
})

// Methods
const { loading, error, load: loadPairs, retry } = usePageLoad(async () => {
  const options = {}
  if (statusFilter.value) options.status = statusFilter.value
  if (tankFilter.value) options.tankId = tankFilter.value
  const { error: fetchError } = await fetchPairs(options)
  if (fetchError) throw fetchError
})

const loadTanks = async () => {
  loadingTanks.value = true
  try {
    await fetchTanks({ status: 'active' })
  } finally {
    loadingTanks.value = false
  }
}

const loadHatches = async () => {
  await fetchHatches()
}

const pairHatches = (pairId) => {
  return hatches.value.filter(h => h.pair_id === pairId)
}

const clearFilters = () => {
  statusFilter.value = null
  tankFilter.value = null
  loadPairs()
}

// Pair Modal
const openPairModal = (pair = null) => {
  // Always reset editingPair first
  editingPair.value = null
  
  if (pair && pair.id) {
    // Editing existing pair
    editingPair.value = pair
    pairForm.value = {
      male_species: pair.male_species || '',
      female_species: pair.female_species || '',
      tank_id: pair.tank_id,
      paired_date: pair.paired_date || null,
      status: pair.status || 'active',
      notes: pair.notes || ''
    }
  } else {
    // Creating new pair
    editingPair.value = null
    pairForm.value = {
      male_species: '',
      female_species: '',
      tank_id: null,
      paired_date: null,
      status: 'active',
      notes: ''
    }
  }
  pairModal.value?.showModal()
}

const closePairModal = () => {
  pairModal.value?.close()
  editingPair.value = null
}

const handlePairSubmit = async () => {
  submitting.value = true
  try {
    if (editingPair.value && editingPair.value.id) {
      const result = await updatePair(editingPair.value.id, pairForm.value)
      if (result.error) {
        throw result.error
      }
      showSuccess('Pair updated successfully')
    } else {
      const result = await createPair(pairForm.value)
      if (result.error) {
        throw result.error
      }
      showSuccess('Pair created successfully')
    }
    closePairModal()
    await loadPairs()
  } catch (err) {
    console.error('Error saving pair:', err)
    showError('Error saving pair: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const viewHatches = (pair) => {
  selectedPair.value = pair
  hatchesViewModal.value?.showModal()
}

const closeHatchesViewModal = () => {
  hatchesViewModal.value?.close()
  selectedPair.value = null
}

// Tank Modal
const openTankModal = async () => {
  await loadTanks()
  tankModal.value?.showModal()
}

const closeTankModal = () => {
  tankModal.value?.close()
}

const openTankEditModal = (tank = null) => {
  editingTank.value = tank
  if (tank) {
    tankForm.value = {
      name: tank.name || '',
      capacity_gallons: tank.capacity_gallons || null,
      status: tank.status || 'active',
      description: tank.description || ''
    }
  } else {
    tankForm.value = {
      name: '',
      capacity_gallons: null,
      status: 'active',
      description: ''
    }
  }
  tankEditModal.value?.showModal()
}

const closeTankEditModal = () => {
  tankEditModal.value?.close()
  editingTank.value = null
}

const handleTankSubmit = async () => {
  submitting.value = true
  try {
    if (editingTank.value) {
      await updateTank(editingTank.value.id, tankForm.value)
      showSuccess('Tank updated successfully')
    } else {
      await createTank(tankForm.value)
      showSuccess('Tank created successfully')
    }
    closeTankEditModal()
    await loadTanks()
    await loadPairs()
  } catch (err) {
    console.error('Error saving tank:', err)
    showError('Error saving tank: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

// Delete Confirmations
const deletePairConfirm = (pair) => {
  pairToDelete.value = pair
  deletePairModal.value?.showModal()
}

const closeDeletePairModal = () => {
  deletePairModal.value?.close()
  pairToDelete.value = null
}

const confirmDeletePair = async () => {
  if (!pairToDelete.value) return
  submitting.value = true
  try {
    await deletePair(pairToDelete.value.id)
    showSuccess('Pair deleted successfully')
    closeDeletePairModal()
    await loadPairs()
    await loadHatches()
  } catch (err) {
    console.error('Error deleting pair:', err)
    showError('Error deleting pair: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const deleteTankConfirm = (tank) => {
  tankToDelete.value = tank
  deleteTankModal.value?.showModal()
}

const closeDeleteTankModal = () => {
  deleteTankModal.value?.close()
  tankToDelete.value = null
}

const confirmDeleteTank = async () => {
  if (!tankToDelete.value) return
  submitting.value = true
  try {
    await deleteTank(tankToDelete.value.id)
    showSuccess('Tank deleted successfully')
    closeDeleteTankModal()
    await loadTanks()
    await loadPairs()
  } catch (err) {
    console.error('Error deleting tank:', err)
    showError('Error deleting tank: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const getStatusBadgeClass = (status) => {
  return status === 'active' ? 'badge-success' : 'badge-ghost'
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
    loadPairs(),
    loadTanks(),
    loadHatches()
  ])
})
</script>


