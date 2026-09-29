import { withTimeout } from '~/utils/loadState'

export const useUsers = () => {
  const supabase = useSupabaseClient()
  const { user: currentUser } = useAuth()

  const users = useState('adminUsers', () => [])
  const loading = useState('usersLoading', () => false)
  const error = useState('usersError', () => null)

  const fetchUsers = async () => {
    try {
      loading.value = true
      error.value = null

      const { data: profiles, error: profilesError } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
      )

      if (profilesError) throw profilesError

      const userList = profiles?.map((profile) => ({
        id: profile.id,
        email: currentUser.value?.id === profile.id
          ? currentUser.value.email
          : `user-${profile.id.substring(0, 8)}@example.com`,
        firstname: profile.firstname,
        lastname: profile.lastname,
        role: profile.role,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      })) || []

      users.value = userList
      return { data: userList, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching users:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updateUserRole = async (userId, newRole) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) throw updateError

      const index = users.value.findIndex((u) => u.id === userId)
      if (index !== -1) {
        users.value[index].role = newRole
      }

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error updating user role:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updateUserProfile = async (userId, updates) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (updateError) throw updateError

      const index = users.value.findIndex((u) => u.id === userId)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...updates }
      }

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error updating user profile:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  return {
    users: readonly(users),
    loading: readonly(loading),
    error: readonly(error),
    fetchUsers,
    updateUserRole,
    updateUserProfile
  }
}
