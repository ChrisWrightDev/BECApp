<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-4xl font-bold mb-2">User Management</h1>
        <p class="text-base-content/70">Manage users and their permissions</p>
      </div>
      <button @click="loadUsers" class="btn btn-outline">
        <Icon name="mdi:refresh" class="w-5 h-5" />
        Refresh
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="alert alert-error mb-6">
      <Icon name="mdi:alert-circle" class="w-6 h-6" />
      <span>{{ error }}</span>
      <div class="text-sm mt-2">
        <p>Note: Full user management requires Supabase Admin API access.</p>
        <p>This page shows users based on their activity in the system.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Users Table -->
    <div v-else-if="users.length > 0" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Projects Created</th>
                <th>Active Projects</th>
                <th>Tasks Assigned</th>
                <th>Tasks Completed</th>
                <th>Completion Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                      <div class="bg-primary text-primary-content rounded-full w-10">
                        <span>{{ getUserInitials(user) }}</span>
                      </div>
                    </div>
                    <div>
                      <div class="font-semibold">
                        {{ getUserDisplayName(user) }}
                      </div>
                      <div class="text-sm text-base-content/60">
                        {{ user.email || 'ID: ' + user.id.slice(0, 8) + '...' }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <select
                    :value="user.role"
                    @change="handleRoleChange(user.id, $event.target.value)"
                    class="select select-bordered select-sm"
                    :class="getRoleSelectClass(user.role)"
                    :disabled="user.id === currentUserId"
                  >
                    <option value="worker">Worker</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <span class="badge badge-ghost">{{ user.stats?.projectsCreated || 0 }}</span>
                </td>
                <td>
                  <span class="badge badge-success">{{ user.stats?.activeProjects || 0 }}</span>
                </td>
                <td>
                  <span class="badge badge-info">{{ user.stats?.tasksAssigned || 0 }}</span>
                </td>
                <td>
                  <span class="badge badge-success">{{ user.stats?.tasksCompleted || 0 }}</span>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <progress
                      class="progress progress-success w-20"
                      :value="user.stats?.completionRate || 0"
                      max="100"
                    ></progress>
                    <span class="text-sm font-semibold">{{ user.stats?.completionRate || 0 }}%</span>
                  </div>
                </td>
                <td>
                  <div class="flex gap-2">
                    <button
                      @click="openEditModal(user)"
                      class="btn btn-ghost btn-sm"
                    >
                      <Icon name="mdi:pencil" class="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      @click="viewUserDetails(user)"
                      class="btn btn-ghost btn-sm"
                    >
                      <Icon name="mdi:information-outline" class="w-4 h-4" />
                      Details
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <Icon name="mdi:account-group" class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <p class="text-lg text-base-content/70">No users found</p>
        <p class="text-sm text-base-content/50 mt-2">
          Users will appear here as they create projects or complete tasks
        </p>
      </div>
    </div>

    <!-- Edit User Modal -->
    <dialog ref="editUserModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Edit User</h3>
        <form @submit.prevent="handleUpdateUser" class="space-y-4">
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
            <label class="label" v-if="editingUser?.id === currentUserId">
              <span class="label-text-alt text-warning">You cannot change your own role</span>
            </label>
          </div>
          <div class="modal-action">
            <button type="button" @click="closeEditModal" class="btn btn-ghost">Cancel</button>
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

    <!-- User Details Modal -->
    <dialog ref="userDetailsModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">User Details</h3>
        <div v-if="selectedUser" class="space-y-4">
          <div>
            <label class="label">
              <span class="label-text font-semibold">Name</span>
            </label>
            <p class="text-base-content/70">{{ getUserDisplayName(selectedUser) }}</p>
          </div>
          <div>
            <label class="label">
              <span class="label-text font-semibold">Email</span>
            </label>
            <p class="text-base-content/70">{{ selectedUser.email || 'N/A' }}</p>
          </div>
          <div>
            <label class="label">
              <span class="label-text font-semibold">User ID</span>
            </label>
            <p class="text-base-content/70 font-mono text-sm">{{ selectedUser.id }}</p>
          </div>
          <div>
            <label class="label">
              <span class="label-text font-semibold">Role</span>
            </label>
            <p class="text-base-content/70">
              <span class="badge" :class="getRoleBadgeClass(selectedUser.role)">
                {{ selectedUser.role }}
              </span>
            </p>
          </div>
          <div class="divider"></div>
          <h4 class="font-semibold mb-2">Statistics</h4>
          <div class="grid grid-cols-2 gap-4">
            <div class="stat bg-base-200 rounded-box">
              <div class="stat-title">Projects Created</div>
              <div class="stat-value text-lg">{{ selectedUser.stats?.projectsCreated || 0 }}</div>
            </div>
            <div class="stat bg-base-200 rounded-box">
              <div class="stat-title">Active Projects</div>
              <div class="stat-value text-lg text-success">{{ selectedUser.stats?.activeProjects || 0 }}</div>
            </div>
            <div class="stat bg-base-200 rounded-box">
              <div class="stat-title">Tasks Assigned</div>
              <div class="stat-value text-lg text-info">{{ selectedUser.stats?.tasksAssigned || 0 }}</div>
            </div>
            <div class="stat bg-base-200 rounded-box">
              <div class="stat-title">Tasks Completed</div>
              <div class="stat-value text-lg text-success">{{ selectedUser.stats?.tasksCompleted || 0 }}</div>
            </div>
          </div>
          <div class="stat bg-base-200 rounded-box">
            <div class="stat-title">Completion Rate</div>
            <div class="stat-value text-lg">{{ selectedUser.stats?.completionRate || 0 }}%</div>
          </div>
        </div>
        <div class="modal-action">
          <button @click="closeUserDetailsModal" class="btn">Close</button>
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
  loading,
  error,
  fetchUsersWithStats,
  updateUserRole,
  updateUserProfile
} = useUsers()

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

// Methods
const loadUsers = async () => {
  await fetchUsersWithStats()
}

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
    await loadUsers() // Refresh the list
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
    await loadUsers() // Refresh the list
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
  if (user.firstname) {
    return user.firstname.charAt(0).toUpperCase()
  }
  if (user.email && user.email.includes('@')) {
    return user.email.charAt(0).toUpperCase()
  }
  return 'U'
}

const getUserDisplayName = (user) => {
  if (user.firstname && user.lastname) {
    return `${user.firstname} ${user.lastname}`
  }
  if (user.firstname) {
    return user.firstname
  }
  if (user.lastname) {
    return user.lastname
  }
  return user.email || `User ${user.id.slice(0, 8)}`
}

const getRoleBadgeClass = (role) => {
  return role === 'admin' ? 'badge-error' : 'badge-ghost'
}

const getRoleSelectClass = (role) => {
  return role === 'admin' ? 'select-error' : 'select-ghost'
}

// Initialize
onMounted(async () => {
  await loadUsers()
})
</script>

