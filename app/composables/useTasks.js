export const useTasks = () => {
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  
  const tasks = useState('tasks', () => [])
  const loading = useState('tasksLoading', () => false)
  const error = useState('tasksError', () => null)
  const filters = useState('tasksFilters', () => ({
    status: null,
    timeWindow: null,
    date: null
  }))

  // Computed getters
  const tasksByTimeWindow = computed(() => {
    const grouped = {
      morning: [],
      midday: [],
      afternoon: [],
      evening: []
    }
    tasks.value.forEach(task => {
      if (task.time_window && grouped[task.time_window]) {
        grouped[task.time_window].push(task)
      }
    })
    return grouped
  })

  const tasksByStatus = computed(() => {
    const grouped = {}
    tasks.value.forEach(task => {
      if (!grouped[task.status]) {
        grouped[task.status] = []
      }
      grouped[task.status].push(task)
    })
    return grouped
  })

  const pendingTasks = computed(() => {
    return tasks.value.filter(task => task.status === 'pending')
  })

  const inProgressTasks = computed(() => {
    return tasks.value.filter(task => task.status === 'in_progress')
  })

  const completedTasks = computed(() => {
    return tasks.value.filter(task => task.status === 'completed')
  })

  const filteredTasks = computed(() => {
    let result = [...tasks.value]
    
    if (filters.value.status) {
      result = result.filter(t => t.status === filters.value.status)
    }
    
    if (filters.value.timeWindow) {
      result = result.filter(t => t.time_window === filters.value.timeWindow)
    }
    
    if (filters.value.date) {
      result = result.filter(t => t.due_date === filters.value.date)
    }
    
    return result
  })

  // Helper function to extract tank name from project description
  const extractTankFromProject = (projectDescription) => {
    if (!projectDescription) return null
    const tankMatch = projectDescription.match(/Tank:\s*([^\n]+)/i)
    return tankMatch ? tankMatch[1].trim() : null
  }

  // Supabase operations
  const fetchTasks = async (options = {}) => {
    try {
      loading.value = true
      error.value = null
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects:project_id (
            id,
            name,
            description,
            template_id,
            current_phase_id,
            templates:template_id (
              id,
              type
            ),
            phases:current_phase_id (
              id,
              name,
              order_index
            )
          )
        `)
        .order('due_date', { ascending: true })
        .order('scheduled_time', { ascending: true, nullsFirst: false })

      // Apply filters
      if (options.status) {
        query = query.eq('status', options.status)
      }
      
      if (options.date) {
        query = query.eq('due_date', options.date)
      }
      
      if (options.timeWindow) {
        query = query.eq('time_window', options.timeWindow)
      }
      
      if (options.projectId) {
        query = query.eq('project_id', options.projectId)
      }
      
      if (options.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Transform data to include project name and extract tank info
      const transformedTasks = data.map(task => {
        const projectName = task.projects?.name || 'Unknown Project'
        const projectDescription = task.projects?.description || ''
        const tankName = extractTankFromProject(projectDescription)
        const hasPhases = task.projects?.template_id && task.projects?.current_phase_id !== null
        
        return {
          ...task,
          project_name: projectName,
          tank_name: tankName,
          project_id: task.projects?.id,
          project_template_id: task.projects?.template_id,
          project_current_phase_id: task.projects?.current_phase_id,
          project_current_phase_order: task.projects?.phases?.order_index,
          project_has_phases: hasPhases
        }
      })

      tasks.value = transformedTasks
      return { data: transformedTasks, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching tasks:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const createTask = async (taskData) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: createError } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          projects:project_id (
            id,
            name,
            description,
            template_id,
            current_phase_id,
            templates:template_id (
              id,
              type
            ),
            phases:current_phase_id (
              id,
              name,
              order_index
            )
          )
        `)
        .single()

      if (createError) throw createError

      const projectName = data.projects?.name || 'Unknown Project'
      const projectDescription = data.projects?.description || ''
      const tankName = extractTankFromProject(projectDescription)
      const hasPhases = data.projects?.template_id && data.projects?.current_phase_id !== null
      
      const transformedTask = {
        ...data,
        project_name: projectName,
        tank_name: tankName,
        project_id: data.projects?.id,
        project_template_id: data.projects?.template_id,
        project_current_phase_id: data.projects?.current_phase_id,
        project_current_phase_order: data.projects?.phases?.order_index,
        project_has_phases: hasPhases
      }

      tasks.value.push(transformedTask)
      return { data: transformedTask, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error creating task:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updateTask = async (taskId, updates) => {
    try {
      loading.value = true
      error.value = null

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      // If completing task, set completion fields
      if (updates.status === 'completed' && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString()
        updateData.completed_by = user.value?.id
      }

      const { data, error: updateError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select(`
          *,
          projects:project_id (
            id,
            name,
            description,
            template_id,
            current_phase_id,
            templates:template_id (
              id,
              type
            ),
            phases:current_phase_id (
              id,
              name,
              order_index
            )
          )
        `)
        .single()

      if (updateError) throw updateError

      const projectName = data.projects?.name || 'Unknown Project'
      const projectDescription = data.projects?.description || ''
      const tankName = extractTankFromProject(projectDescription)
      const hasPhases = data.projects?.template_id && data.projects?.current_phase_id !== null
      
      const transformedTask = {
        ...data,
        project_name: projectName,
        tank_name: tankName,
        project_id: data.projects?.id,
        project_template_id: data.projects?.template_id,
        project_current_phase_id: data.projects?.current_phase_id,
        project_current_phase_order: data.projects?.phases?.order_index,
        project_has_phases: hasPhases
      }

      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = transformedTask
      }

      return { data: transformedTask, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error updating task:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const deleteTask = async (taskId) => {
    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (deleteError) throw deleteError

      tasks.value = tasks.value.filter(t => t.id !== taskId)
      return { error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting task:', err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  const updateTaskStatus = async (taskId, status, completionNotes = null) => {
    const updates = { status }
    if (completionNotes) {
      updates.completion_notes = completionNotes
    }
    return updateTask(taskId, updates)
  }

  // Task generation from templates
  const generateTasksFromPhase = async (projectId, phaseId, dueDate) => {
    try {
      loading.value = true
      error.value = null

      // Fetch phase tasks for this phase
      const { data: phaseTasks, error: phaseTasksError } = await supabase
        .from('phase_tasks')
        .select('*')
        .eq('phase_id', phaseId)
        .order('order_index', { ascending: true })

      if (phaseTasksError) throw phaseTasksError

      if (!phaseTasks || phaseTasks.length === 0) {
        return { data: [], error: null }
      }

      // Generate tasks from phase tasks
      const tasksToCreate = phaseTasks.map(phaseTask => ({
        project_id: projectId,
        phase_task_id: phaseTask.id,
        title: phaseTask.title,
        description: phaseTask.description || null,
        status: 'pending',
        time_window: phaseTask.time_window || null,
        scheduled_time: phaseTask.scheduled_time || null,
        due_date: dueDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Insert all tasks
      const { data: createdTasks, error: createError } = await supabase
        .from('tasks')
        .insert(tasksToCreate)
        .select(`
          *,
          projects:project_id (
            id,
            name,
            description,
            template_id,
            current_phase_id,
            templates:template_id (
              id,
              type
            ),
            phases:current_phase_id (
              id,
              name,
              order_index
            )
          )
        `)

      if (createError) throw createError

      // Transform data
      const transformedTasks = createdTasks.map(task => {
        const projectName = task.projects?.name || 'Unknown Project'
        const projectDescription = task.projects?.description || ''
        const tankName = extractTankFromProject(projectDescription)
        const hasPhases = task.projects?.template_id && task.projects?.current_phase_id !== null
        
        return {
          ...task,
          project_name: projectName,
          tank_name: tankName,
          project_id: task.projects?.id,
          project_template_id: task.projects?.template_id,
          project_current_phase_id: task.projects?.current_phase_id,
          project_current_phase_order: task.projects?.phases?.order_index,
          project_has_phases: hasPhases
        }
      })

      // Add to local state
      tasks.value.push(...transformedTasks)

      return { data: transformedTasks, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error generating tasks:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const generateTasksForProject = async (projectId, dueDate = null) => {
    try {
      const targetDate = dueDate || new Date().toISOString().split('T')[0]

      // Get project with current phase
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('current_phase_id, template_id, templates:template_id(type, interval_days)')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError

      if (!project.current_phase_id) {
        return { data: [], error: null }
      }

      // Check if tasks already exist for this date and phase
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', projectId)
        .eq('due_date', targetDate)

      // For recurring templates, check if we should generate based on interval
      if (project.templates?.type === 'recurring_interval' && project.templates?.interval_days) {
        // Check last task generation date
        const { data: lastTasks } = await supabase
          .from('tasks')
          .select('due_date')
          .eq('project_id', projectId)
          .order('due_date', { ascending: false })
          .limit(1)

        if (lastTasks && lastTasks.length > 0) {
          const lastDate = new Date(lastTasks[0].due_date)
          const daysSince = Math.floor((new Date(targetDate) - lastDate) / (1000 * 60 * 60 * 24))
          
          if (daysSince < project.templates.interval_days) {
            return { data: [], error: null } // Not time to generate yet
          }
        }
      }

      // Generate tasks for the current phase
      return await generateTasksFromPhase(projectId, project.current_phase_id, targetDate)
    } catch (err) {
      error.value = err.message
      console.error('Error generating tasks for project:', err)
      return { data: null, error: err }
    }
  }

  const generateDailyTasks = async (date = null) => {
    try {
      loading.value = true
      error.value = null

      const targetDate = date || new Date().toISOString().split('T')[0]

      // Get all active projects
      const { data: activeProjects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          current_phase_id,
          template_id,
          templates:template_id (
            type,
            interval_days
          )
        `)
        .eq('status', 'active')

      if (projectsError) throw projectsError

      if (!activeProjects || activeProjects.length === 0) {
        return { data: [], error: null }
      }

      const allGeneratedTasks = []

      for (const project of activeProjects) {
        if (!project.current_phase_id) continue

        const templateType = project.templates?.type

        // Handle different template types
        if (templateType === 'recurring_daily') {
          // Generate tasks every day
          const result = await generateTasksFromPhase(project.id, project.current_phase_id, targetDate)
          if (result.data) {
            allGeneratedTasks.push(...result.data)
          }
        } else if (templateType === 'recurring_interval' && project.templates?.interval_days) {
          // Check if we should generate based on interval
          const { data: lastTasks } = await supabase
            .from('tasks')
            .select('due_date')
            .eq('project_id', project.id)
            .order('due_date', { ascending: false })
            .limit(1)

          let shouldGenerate = false

          if (!lastTasks || lastTasks.length === 0) {
            shouldGenerate = true
          } else {
            const lastDate = new Date(lastTasks[0].due_date)
            const daysSince = Math.floor((new Date(targetDate) - lastDate) / (1000 * 60 * 60 * 24))
            shouldGenerate = daysSince >= project.templates.interval_days
          }

          if (shouldGenerate) {
            const result = await generateTasksFromPhase(project.id, project.current_phase_id, targetDate)
            if (result.data) {
              allGeneratedTasks.push(...result.data)
            }
          }
        } else if (templateType === 'lifecycle') {
          // For lifecycle, only generate if no tasks exist for today
          const { data: existingTasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('project_id', project.id)
            .eq('due_date', targetDate)
            .limit(1)

          if (!existingTasks || existingTasks.length === 0) {
            const result = await generateTasksFromPhase(project.id, project.current_phase_id, targetDate)
            if (result.data) {
              allGeneratedTasks.push(...result.data)
            }
          }
        }
      }

      return { data: allGeneratedTasks, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error generating daily tasks:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Local state management (for optimistic updates)
  const setTasks = (newTasks) => {
    tasks.value = newTasks
  }

  const addTask = (task) => {
    tasks.value.push(task)
  }

  const removeTask = (taskId) => {
    tasks.value = tasks.value.filter(t => t.id !== taskId)
  }

  const setLoading = (isLoading) => {
    loading.value = isLoading
  }

  const setError = (err) => {
    error.value = err
  }

  const setFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const clearFilters = () => {
    filters.value = {
      status: null,
      timeWindow: null,
      date: null
    }
  }

  return {
    // State
    tasks: readonly(tasks),
    loading: readonly(loading),
    error: readonly(error),
    filters: readonly(filters),
    // Getters
    tasksByTimeWindow,
    tasksByStatus,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    filteredTasks,
    // Supabase operations
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    // Task generation
    generateTasksFromPhase,
    generateTasksForProject,
    generateDailyTasks,
    // Local state management
    setTasks,
    addTask,
    removeTask,
    setLoading,
    setError,
    setFilters,
    clearFilters
  }
}

