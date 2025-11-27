export const useUsers = () => {
  const supabase = useSupabaseClient()
  const { user: currentUser } = useAuth()
  
  const users = useState('adminUsers', () => [])
  const loading = useState('usersLoading', () => false)
  const error = useState('usersError', () => null)

  // Fetch all users from profiles table
  const fetchUsers = async () => {
    try {
      loading.value = true
      error.value = null

      // Fetch all profiles (admin can see all)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Get user emails from auth.users (requires admin API in production)
      // For now, we'll use the profile data and try to get email from current session
      const userList = profiles?.map(profile => ({
        id: profile.id,
        email: currentUser.value?.id === profile.id 
          ? currentUser.value.email 
          : `user-${profile.id.substring(0, 8)}@example.com`, // Placeholder
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

  // Get user statistics
  const getUserStats = async (userId) => {
    try {
      loading.value = true
      error.value = null

      const [projectsResult, tasksResult, completedTasksResult] = await Promise.all([
        supabase
          .from('projects')
          .select('id, status, created_at')
          .eq('created_by', userId),
        supabase
          .from('tasks')
          .select('id, status')
          .eq('assigned_to', userId),
        supabase
          .from('tasks')
          .select('id, completed_at')
          .eq('completed_by', userId)
          .eq('status', 'completed')
      ])

      const stats = {
        projectsCreated: projectsResult.data?.length || 0,
        activeProjects: projectsResult.data?.filter(p => p.status === 'active').length || 0,
        tasksAssigned: tasksResult.data?.length || 0,
        tasksCompleted: completedTasksResult.data?.length || 0,
        completionRate: tasksResult.data?.length > 0
          ? Math.round((completedTasksResult.data?.length / tasksResult.data.length) * 100)
          : 0
      }

      return { data: stats, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching user stats:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Update user role in profiles table
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

      // Update local state
      const index = users.value.findIndex(u => u.id === userId)
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

  // Update user profile (firstname, lastname, role)
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

      // Update local state
      const index = users.value.findIndex(u => u.id === userId)
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

  // Get all users with their statistics
  const fetchUsersWithStats = async () => {
    try {
      loading.value = true
      error.value = null

      const result = await fetchUsers()
      if (result.error) throw result.error

      // Ensure we have valid data
      const usersList = result.data || []
      if (!Array.isArray(usersList)) {
        throw new Error('Invalid users data format')
      }

      // Get stats for each user
      const usersWithStats = await Promise.all(
        usersList.map(async (user) => {
          const { data: stats } = await getUserStats(user.id)
          return {
            ...user,
            stats: stats || {
              projectsCreated: 0,
              activeProjects: 0,
              tasksAssigned: 0,
              tasksCompleted: 0,
              completionRate: 0
            }
          }
        })
      )

      users.value = usersWithStats
      return { data: usersWithStats, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching users with stats:', err)
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
    getUserStats,
    updateUserRole,
    updateUserProfile,
    fetchUsersWithStats
  }
}

