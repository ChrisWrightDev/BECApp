export const useAnalytics = () => {
  const supabase = useSupabaseClient()
  
  const loading = useState('analyticsLoading', () => false)
  const error = useState('analyticsError', () => null)

  // Fetch system-wide statistics
  const fetchSystemStats = async () => {
    try {
      loading.value = true
      error.value = null

      // Get counts for various entities
      const [
        { count: projectsCount },
        { count: tasksCount },
        { count: templatesCount },
        { count: pairsCount },
        { count: tanksCount },
        { count: usersCount }
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('templates').select('*', { count: 'exact', head: true }),
        supabase.from('mated_pairs').select('*', { count: 'exact', head: true }),
        supabase.from('tanks').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
      ])

      return {
        data: {
          projects: projectsCount || 0,
          tasks: tasksCount || 0,
          templates: templatesCount || 0,
          pairs: pairsCount || 0,
          tanks: tanksCount || 0,
          users: usersCount || 0
        },
        error: null
      }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching system stats:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Fetch project statistics
  const fetchProjectStats = async () => {
    try {
      loading.value = true
      error.value = null

      const { data: projects, error: fetchError } = await supabase
        .from('projects')
        .select('status, created_at')

      if (fetchError) throw fetchError

      const stats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        paused: projects.filter(p => p.status === 'paused').length,
        completed: projects.filter(p => p.status === 'completed').length,
        cancelled: projects.filter(p => p.status === 'cancelled').length,
        byMonth: {}
      }

      // Group by month
      projects.forEach(project => {
        const date = new Date(project.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!stats.byMonth[monthKey]) {
          stats.byMonth[monthKey] = 0
        }
        stats.byMonth[monthKey]++
      })

      return { data: stats, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching project stats:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Fetch task statistics
  const fetchTaskStats = async (dateRange = null) => {
    try {
      loading.value = true
      error.value = null

      let query = supabase
        .from('tasks')
        .select('status, due_date, completed_at, created_at')

      if (dateRange) {
        if (dateRange.start) {
          query = query.gte('due_date', dateRange.start)
        }
        if (dateRange.end) {
          query = query.lte('due_date', dateRange.end)
        }
      }

      const { data: tasks, error: fetchError } = await query

      if (fetchError) throw fetchError

      const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        skipped: tasks.filter(t => t.status === 'skipped').length,
        cancelled: tasks.filter(t => t.status === 'cancelled').length,
        completionRate: tasks.length > 0 
          ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
          : 0,
        byDate: {},
        byTimeWindow: {
          morning: 0,
          midday: 0,
          afternoon: 0,
          evening: 0
        }
      }

      // Group by date
      tasks.forEach(task => {
        if (task.due_date) {
          if (!stats.byDate[task.due_date]) {
            stats.byDate[task.due_date] = { total: 0, completed: 0 }
          }
          stats.byDate[task.due_date].total++
          if (task.status === 'completed') {
            stats.byDate[task.due_date].completed++
          }
        }

        // Count by time window
        if (task.time_window && stats.byTimeWindow[task.time_window] !== undefined) {
          stats.byTimeWindow[task.time_window]++
        }
      })

      return { data: stats, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching task stats:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Fetch template usage statistics
  const fetchTemplateStats = async () => {
    try {
      loading.value = true
      error.value = null

      const { data: templates, error: templatesError } = await supabase
        .from('templates')
        .select('id, name, type')

      if (templatesError) throw templatesError

      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('template_id, status')

      if (projectsError) throw projectsError

      const stats = templates.map(template => {
        const templateProjects = projects.filter(p => p.template_id === template.id)
        return {
          id: template.id,
          name: template.name,
          type: template.type,
          totalProjects: templateProjects.length,
          activeProjects: templateProjects.filter(p => p.status === 'active').length,
          completedProjects: templateProjects.filter(p => p.status === 'completed').length
        }
      })

      return { data: stats, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching template stats:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Fetch activity over time
  const fetchActivityStats = async (days = 30) => {
    try {
      loading.value = true
      error.value = null

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startDateStr = startDate.toISOString().split('T')[0]

      // Get task completions
      const { data: completedTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('completed_at')
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())

      if (tasksError) throw tasksError

      // Get project creations
      const { data: newProjects, error: projectsError } = await supabase
        .from('projects')
        .select('created_at')
        .gte('created_at', startDate.toISOString())

      if (projectsError) throw projectsError

      // Get phase changes
      const { data: phaseChanges, error: historyError } = await supabase
        .from('project_history')
        .select('created_at, action')
        .in('action', ['phase_started', 'phase_completed'])
        .gte('created_at', startDate.toISOString())

      if (historyError) throw historyError

      // Group by date
      const activity = {}
      const endDate = new Date()
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0]
        activity[dateKey] = {
          tasksCompleted: 0,
          projectsCreated: 0,
          phasesChanged: 0
        }
      }

      completedTasks?.forEach(task => {
        if (task.completed_at) {
          const dateKey = task.completed_at.split('T')[0]
          if (activity[dateKey]) {
            activity[dateKey].tasksCompleted++
          }
        }
      })

      newProjects?.forEach(project => {
        const dateKey = project.created_at.split('T')[0]
        if (activity[dateKey]) {
          activity[dateKey].projectsCreated++
        }
      })

      phaseChanges?.forEach(change => {
        const dateKey = change.created_at.split('T')[0]
        if (activity[dateKey]) {
          activity[dateKey].phasesChanged++
        }
      })

      return { data: activity, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching activity stats:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Fetch user activity (if we have user tracking)
  const fetchUserStats = async () => {
    try {
      loading.value = true
      error.value = null

      // Get tasks completed by user
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('completed_by, completed_at')
        .eq('status', 'completed')
        .not('completed_by', 'is', null)

      if (tasksError) throw tasksError

      // Get projects created by user
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('created_by, created_at')
        .not('created_by', 'is', null)

      if (projectsError) throw projectsError

      const userStats = {}

      tasks?.forEach(task => {
        if (task.completed_by) {
          if (!userStats[task.completed_by]) {
            userStats[task.completed_by] = {
              tasksCompleted: 0,
              projectsCreated: 0
            }
          }
          userStats[task.completed_by].tasksCompleted++
        }
      })

      projects?.forEach(project => {
        if (project.created_by) {
          if (!userStats[project.created_by]) {
            userStats[project.created_by] = {
              tasksCompleted: 0,
              projectsCreated: 0
            }
          }
          userStats[project.created_by].projectsCreated++
        }
      })

      return { data: userStats, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching user stats:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    fetchSystemStats,
    fetchProjectStats,
    fetchTaskStats,
    fetchTemplateStats,
    fetchActivityStats,
    fetchUserStats
  }
}


