<template>
  <div>
    <div class="mb-4 sm:mb-8">
      <div class="mb-4 sm:mb-6">
        <h1 class="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2">Tank Management</h1>
        <p class="text-sm sm:text-base text-base-content/70">Manage tank labels and bank layout</p>
      </div>
      <div class="flex flex-col sm:flex-row gap-2">
        <select v-model="systemFilter" class="select select-bordered select-sm sm:select-md w-full sm:w-auto">
          <option :value="null">All Systems</option>
          <option value="A">System A</option>
          <option value="B">System B</option>
          <option value="C">System C</option>
          <option value="D">System D</option>
          <option value="E">System E</option>
          <option value="F">System F</option>
        </select>
        <select v-model="roleFilter" class="select select-bordered select-sm sm:select-md w-full sm:w-auto">
          <option :value="null">All Roles</option>
          <option value="mated_pair">Mated Pair</option>
          <option value="grow_out">Grow Out</option>
          <option value="hatch">Hatch</option>
        </select>
        <button @click="clearFilters" class="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto">
          Clear Filters
        </button>
      </div>
    </div>

    <PageLoadState
      :loading="loading"
      :error="error"
      :empty="groupedTanks.length === 0"
      empty-icon="mdi:water"
      empty-title="No tanks found"
      empty-description="Tanks will appear here once they are added to the system"
      @retry="retry"
    >
    <!-- Tanks by System -->
    <div class="space-y-6">
      <div v-for="group in groupedTanks" :key="group.system || 'unlabeled'" class="card bg-base-100 shadow-xl">
        <div class="card-body p-4 sm:p-6">
          <h2 class="card-title text-lg sm:text-xl mb-4">
            {{ group.system ? `System ${group.system}` : 'Unlabeled Tanks' }}
            <span class="badge badge-lg">{{ group.tanks.length }} tanks</span>
          </h2>

          <!-- Tanks by Row -->
          <div v-for="row in groupByRow(group.tanks)" :key="row.rowNo || 'no-row'" class="mb-4">
            <h3 class="font-semibold text-sm sm:text-base mb-2">
              {{ row.rowNo ? `Row ${row.rowNo}` : 'No Row' }}
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              <div
                v-for="tank in row.tanks"
                :key="tank.id"
                @click="openTankModal(tank)"
                class="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors"
              >
                <div class="card-body p-3">
                  <div class="text-sm font-semibold truncate">{{ tank.label || tank.name }}</div>
                  <div v-if="tank.bank_role" class="badge badge-xs">{{ tank.bank_role }}</div>
                  <div v-if="tank.status !== 'active'" class="badge badge-xs badge-ghost">{{ tank.status }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </PageLoadState>

    <!-- Edit Tank Modal -->
    <dialog ref="tankModal" class="modal">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Edit Tank Label</h3>
        <form @submit.prevent="handleTankSubmit" class="space-y-4">
          <div class="alert alert-info">
            <Icon name="mdi:information" class="w-5 h-5" />
            <div class="text-sm">
              <p class="font-semibold">Tank Label Format: [System][Row]-[Tank]</p>
              <p>Example: B3-10 is System B, Row 3, Tank 10</p>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Current Name</span>
            </label>
            <input
              type="text"
              :value="editingTank?.name"
              class="input input-bordered"
              disabled
            />
          </div>

          <div class="divider">Label Entry</div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Label (e.g., B3-10)</span>
            </label>
            <input
              v-model="tankForm.label"
              type="text"
              placeholder="B3-10"
              class="input input-bordered"
              pattern="^[A-Z][0-9]+-[0-9]+$"
              @input="onLabelInput"
            />
            <label class="label">
              <span class="label-text-alt">Enter a label like A1-5 or leave blank</span>
            </label>
          </div>

          <div class="divider">OR Enter Components</div>

          <div class="grid grid-cols-3 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">System</span>
              </label>
              <select
                v-model="tankForm.system"
                class="select select-bordered"
                @change="onComponentChange"
              >
                <option :value="null">-</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Row</span>
              </label>
              <input
                v-model.number="tankForm.row_no"
                type="number"
                placeholder="1"
                class="input input-bordered"
                min="1"
                @input="onComponentChange"
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Tank</span>
              </label>
              <input
                v-model.number="tankForm.tank_no"
                type="number"
                placeholder="1"
                class="input input-bordered"
                min="1"
                @input="onComponentChange"
              />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Bank Role</span>
            </label>
            <select v-model="tankForm.bank_role" class="select select-bordered">
              <option :value="null">Not set</option>
              <option value="mated_pair">Mated Pair</option>
              <option value="grow_out">Grow Out</option>
              <option value="hatch">Hatch</option>
            </select>
          </div>

          <div class="modal-action">
            <button type="button" @click="closeTankModal" class="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
              Save
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeTankModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const { showSuccess, showError } = useNotifications()
const { tanks, fetchTanks, updateTank } = usePairs()
const { loading, error, load: loadTanks, retry } = usePageLoad(async () => {
  const { error: fetchError } = await fetchTanks()
  if (fetchError) throw fetchError
})

const systemFilter = ref(null)
const roleFilter = ref(null)
const submitting = ref(false)
const tankModal = ref(null)
const editingTank = ref(null)

const tankForm = ref({
  label: null,
  system: null,
  row_no: null,
  tank_no: null,
  bank_role: null
})

// Computed
const filteredTanks = computed(() => {
  let result = [...tanks.value]
  
  if (systemFilter.value) {
    result = result.filter(t => t.system === systemFilter.value)
  }
  
  if (roleFilter.value) {
    result = result.filter(t => t.bank_role === roleFilter.value)
  }
  
  return result
})

const groupedTanks = computed(() => {
  const groups = {}
  filteredTanks.value.forEach(tank => {
    const system = tank.system || 'unlabeled'
    if (!groups[system]) {
      groups[system] = []
    }
    groups[system].push(tank)
  })
  
  // Sort tanks within each system by row_no and tank_no
  Object.values(groups).forEach(tanks => {
    tanks.sort((a, b) => {
      if (a.row_no !== b.row_no) {
        return (a.row_no || 999) - (b.row_no || 999)
      }
      return (a.tank_no || 999) - (b.tank_no || 999)
    })
  })
  
  // Convert to array and sort by system
  return Object.entries(groups)
    .map(([system, tanks]) => ({ system: system === 'unlabeled' ? null : system, tanks }))
    .sort((a, b) => {
      if (!a.system) return 1
      if (!b.system) return -1
      return a.system.localeCompare(b.system)
    })
})

// Methods
const groupByRow = (tanks) => {
  const rows = {}
  tanks.forEach(tank => {
    const rowNo = tank.row_no || 'no-row'
    if (!rows[rowNo]) {
      rows[rowNo] = []
    }
    rows[rowNo].push(tank)
  })
  
  return Object.entries(rows)
    .map(([rowNo, tanks]) => ({ rowNo: rowNo === 'no-row' ? null : rowNo, tanks }))
    .sort((a, b) => {
      if (!a.rowNo) return 1
      if (!b.rowNo) return -1
      return a.rowNo - b.rowNo
    })
}

const clearFilters = () => {
  systemFilter.value = null
  roleFilter.value = null
}

const openTankModal = (tank) => {
  editingTank.value = tank
  tankForm.value = {
    label: tank.label || null,
    system: tank.system || null,
    row_no: tank.row_no || null,
    tank_no: tank.tank_no || null,
    bank_role: tank.bank_role || null
  }
  tankModal.value?.showModal()
}

const closeTankModal = () => {
  tankModal.value?.close()
  editingTank.value = null
}

const onLabelInput = () => {
  // If user enters a label, clear the components (let the trigger parse it)
  if (tankForm.value.label) {
    tankForm.value.system = null
    tankForm.value.row_no = null
    tankForm.value.tank_no = null
  }
}

const onComponentChange = () => {
  // If user enters components, clear the label (let the trigger derive it)
  if (tankForm.value.system || tankForm.value.row_no || tankForm.value.tank_no) {
    tankForm.value.label = null
  }
}

const handleTankSubmit = async () => {
  if (!editingTank.value) return
  
  submitting.value = true
  try {
    // Convert empty strings to null and uppercase label
    const updates = {
      label: tankForm.value.label ? tankForm.value.label.trim().toUpperCase() : null,
      system: tankForm.value.system || null,
      row_no: tankForm.value.row_no ? parseInt(tankForm.value.row_no, 10) : null,
      tank_no: tankForm.value.tank_no ? parseInt(tankForm.value.tank_no, 10) : null,
      bank_role: tankForm.value.bank_role || null
    }
    
    const result = await updateTank(editingTank.value.id, updates)
    if (result.error) {
      throw result.error
    }
    
    showSuccess('Tank label updated successfully')
    closeTankModal()
    await loadTanks()
  } catch (err) {
    console.error('Error updating tank:', err)
    showError('Error updating tank: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

// Initialize
onMounted(async () => {
  await loadTanks()
})
</script>
