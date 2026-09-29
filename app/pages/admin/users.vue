<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 class="text-4xl font-bold mb-4">Users</h1>
        <p class="text-base-content/70">Roles and account details</p>
      </div>
      <button @click="loadUsers" class="btn btn-ghost btn-circle" aria-label="Refresh">
        <Icon name="mdi:refresh" class="w-5 h-5" />
      </button>
    </div>

    <PageLoadState
      :loading="loading"
      :error="error"
      :empty="users.length === 0"
      empty-icon="mdi:account-group"
      empty-title="No users found"
      empty-description="Accounts will appear here as people sign in"
      @retry="retry"
    >
      <div class="space-y-3">
        <div
          v-for="user in users"
          :key="user.id"
          class="card bg-base-100 shadow-xl"
        >
          <div class="card-body">
          <div class="flex items-start gap-3">
            <div class="avatar placeholder">
              <div class="bg-primary text-primary-content rounded-full w-10">
                <span>{{ getUserInitials(user) }}</span>
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-semibold truncate">{{ getUserDisplayName(user) }}</div>
              <div class="text-xs text-base-content/60 truncate">
                {{ user.email || 'ID: ' + user.id.slice(0, 8) + '...' }}
              </div>
            </div>
          </div>

          <div class="mt-3">
            <select
              :value="user.role"
              class="select select-bordered select-sm w-full"
              :class="getRoleSelectClass(user.role)"
              :disabled="user.id === currentUserId"
              @change="handleRoleChange(user.id, $event.target.value)"
            >
              <option value="worker">Worker</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div class="flex gap-2 mt-3">
            <button class="btn btn-ghost btn-sm flex-1" @click="openEditModal(user)">
              <Icon name="mdi:pencil" class="w-4 h-4" />
              Edit
            </button>
            <button class="btn btn-ghost btn-sm flex-1" @click="viewUserDetails(user)">
              <Icon name="mdi:information-outline" class="w-4 h-4" />
              Details
            </button>
          </div>
          </div>
        </div>
      </div>
    </PageLoadState>

    <dialog ref="editUserModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Edit User</h3>
        <form class="space-y-4" @submit.prevent="handleUpdateUser">
          <div class="form-control">
            <label class="label">
              <span class="label-text">First Name</span>
            </label>
            <input
              v-model="editForm.firstname"
              type="text"
              placeholder="First name"
              class="input input-bordered"
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Last Name</span>
            </label>
            <input
              v-model="editForm.lastname"
              type="text"
              placeholder="Last name"
              class="input input-bordered"
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Role</span>
            </label>
            <select
              v-model="editForm.role"
              class="select select-bordered"
              :disabled="editingUser?.id === currentUserId"
            >
              <option value="worker">Worker</option>
              <option value="admin">Admin</option>
            </select>
            <label v-if="editingUser?.id === currentUserId" class="label">
              <span class="label-text-alt text-warning">You cannot change your own role</span>
            </label>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="closeEditModal">Cancel</button>
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

    <dialog ref="userDetailsModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">User Details</h3>
        <div v-if="selectedUser" class="space-y-3">
          <div class="detail-row">
            <dt>Name</dt>
            <dd>{{ getUserDisplayName(selectedUser) }}</dd>
          </div>
          <div class="detail-row">
            <dt>Email</dt>
            <dd>{{ selectedUser.email || 'N/A' }}</dd>
          </div>
          <div class="detail-row">
            <dt>Role</dt>
            <dd>
              <span class="badge" :class="getRoleBadgeClass(selectedUser.role)">
                {{ selectedUser.role }}
              </span>
            </dd>
          </div>
          <div class="detail-row">
            <dt>User ID</dt>
            <dd class="font-mono text-xs">{{ selectedUser.id }}</dd>
          </div>
        </div>
        <div class="modal-action">
          <button class="btn" @click="closeUserDetailsModal">Close</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeUserDetailsModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const { user: currentUser } = useAuth()
const {
  users,
  fetchUsers,
  updateUserRole,
  updateUserProfile
} = useUsers()

const { loading, error, load: loadUsers, retry } = usePageLoad(async () => {
  const { error: fetchError } = await fetchUsers()
  if (fetchError) throw fetchError
})

const userDetailsModal = ref(null)
const editUserModal = ref(null)
const selectedUser = ref(null)
const editingUser = ref(null)
const submitting = ref(false)

const editForm = ref({
  firstname: '',
  lastname: '',
  role: 'worker'
})

const currentUserId = computed(() => currentUser.value?.id)
const { showSuccess, showError, showWarning } = useNotifications()

const handleRoleChange = async (userId, newRole) => {
  if (userId === currentUserId.value) {
    showWarning('You cannot change your own role')
    return
  }

  submitting.value = true
  try {
    await updateUserRole(userId, newRole)
    showSuccess(`User role updated to ${newRole}`)
    await loadUsers()
  } catch (err) {
    console.error('Error updating user role:', err)
    showError('Error updating user role: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const openEditModal = (user) => {
  editingUser.value = user
  editForm.value = {
    firstname: user.firstname || '',
    lastname: user.lastname || '',
    role: user.role || 'worker'
  }
  editUserModal.value?.showModal()
}

const closeEditModal = () => {
  editUserModal.value?.close()
  editingUser.value = null
  editForm.value = {
    firstname: '',
    lastname: '',
    role: 'worker'
  }
}

const handleUpdateUser = async () => {
  if (!editingUser.value) return

  if (editingUser.value.id === currentUserId.value && editForm.value.role !== editingUser.value.role) {
    showWarning('You cannot change your own role')
    return
  }

  submitting.value = true
  try {
    await updateUserProfile(editingUser.value.id, {
      firstname: editForm.value.firstname || null,
      lastname: editForm.value.lastname || null,
      role: editForm.value.role
    })
    showSuccess('User profile updated successfully')
    closeEditModal()
    await loadUsers()
  } catch (err) {
    console.error('Error updating user profile:', err)
    showError('Error updating user profile: ' + (err.message || 'Unknown error'))
  } finally {
    submitting.value = false
  }
}

const viewUserDetails = (user) => {
  selectedUser.value = user
  userDetailsModal.value?.showModal()
}

const closeUserDetailsModal = () => {
  userDetailsModal.value?.close()
  selectedUser.value = null
}

const getUserInitials = (user) => {
  if (user.firstname && user.lastname) {
    return (user.firstname.charAt(0) + user.lastname.charAt(0)).toUpperCase()
  }
  if (user.firstname) return user.firstname.charAt(0).toUpperCase()
  if (user.email && user.email.includes('@')) return user.email.charAt(0).toUpperCase()
  return 'U'
}

const getUserDisplayName = (user) => {
  if (user.firstname && user.lastname) return `${user.firstname} ${user.lastname}`
  if (user.firstname) return user.firstname
  if (user.lastname) return user.lastname
  return user.email || `User ${user.id.slice(0, 8)}`
}

const getRoleBadgeClass = (role) => (role === 'admin' ? 'badge-error' : 'badge-ghost')
const getRoleSelectClass = (role) => (role === 'admin' ? 'select-error' : '')

onMounted(async () => {
  await loadUsers()
})
</script>
