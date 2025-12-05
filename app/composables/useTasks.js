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
      first: [],
      morning: [],
      midday: [],
      afternoon: [],
      evening: [],
      last: []
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
              order_index,
              requires_sequential
            )
          ),
          phase_tasks:phase_task_id (
            id,
            order_index
          ),
          jobs:job_id (
            id,
            name,
            description,
            requires_sequential
          ),
          job_tasks:job_task_id (
            id,
            order_index
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

      // Transform data to include project/job name and extract tank info
      const transformedTasks = data.map(task => {
        // Handle project-based tasks
        if (task.project_id && task.projects) {
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
          project_has_phases: hasPhases,
          phase_requires_sequential: task.projects?.phases?.requires_sequential || false,
          phase_task_order_index: task.phase_tasks?.order_index || null
        }
        }
        
        // Handle job-based tasks
        if (task.job_id && task.jobs) {
          const jobName = task.jobs?.name || 'Unknown Job'
          
          return {
            ...task,
            job_name: jobName,
            job_id: task.jobs?.id,
            job_requires_sequential: task.jobs?.requires_sequential || false,
            job_task_order_index: task.job_tasks?.order_index || null
          }
        }
        
        // Fallback for tasks without project or job
        return task
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
              order_index,
              requires_sequential
            )
          ),
          phase_tasks:phase_task_id (
            id,
            order_index
          ),
          jobs:job_id (
            id,
            name,
            description,
            requires_sequential
          ),
          job_tasks:job_task_id (
            id,
            order_index
          )
        `)
        .single()

      if (createError) throw createError

      // Handle project-based tasks
      if (data.project_id && data.projects) {
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
        project_has_phases: hasPhases,
        phase_requires_sequential: data.projects?.phases?.requires_sequential || false,
        phase_task_order_index: data.phase_tasks?.order_index || null
      }
        
        tasks.value.push(transformedTask)
        return { data: transformedTask, error: null }
      }
      
      // Handle job-based tasks
      if (data.job_id && data.jobs) {
        const jobName = data.jobs?.name || 'Unknown Job'
        
        const transformedTask = {
          ...data,
          job_name: jobName,
          job_id: data.jobs?.id
        }
        
        tasks.value.push(transformedTask)
        return { data: transformedTask, error: null }
      }
      
      // Fallback
      tasks.value.push(data)
      return { data, error: null }

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
              order_index,
              requires_sequential
            )
          ),
          phase_tasks:phase_task_id (
            id,
            order_index
          ),
          jobs:job_id (
            id,
            name,
            description,
            requires_sequential
          ),
          job_tasks:job_task_id (
            id,
            order_index
          )
        `)
        .single()

      if (updateError) throw updateError

      // Handle project-based tasks
      if (data.project_id && data.projects) {
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
        project_has_phases: hasPhases,
        phase_requires_sequential: data.projects?.phases?.requires_sequential || false,
        phase_task_order_index: data.phase_tasks?.order_index || null
      }

      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = transformedTask
      }

      return { data: transformedTask, error: null }
      }
      
      // Handle job-based tasks
      if (data.job_id && data.jobs) {
        const jobName = data.jobs?.name || 'Unknown Job'
        
        const transformedTask = {
          ...data,
          job_name: jobName,
          job_id: data.jobs?.id
        }

        const index = tasks.value.findIndex(t => t.id === taskId)
        if (index !== -1) {
          tasks.value[index] = transformedTask
        }

        return { data: transformedTask, error: null }
      }
      
      // Fallback
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = data
      }

      return { data, error: null }
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
              order_index,
              requires_sequential
            )
          ),
          phase_tasks:phase_task_id (
            id,
            order_index
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
          project_has_phases: hasPhases,
          phase_requires_sequential: task.projects?.phases?.requires_sequential || false,
          phase_task_order_index: task.phase_tasks?.order_index || null
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
        .select('current_phase_id, template_id')
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

      if (existingTasks && existingTasks.length > 0) {
        return { data: [], error: null } // Tasks already exist
      }

      // Generate tasks for the current phase
      return await generateTasksFromPhase(projectId, project.current_phase_id, targetDate)
    } catch (err) {
      error.value = err.message
      console.error('Error generating tasks for project:', err)
      return { data: null, error: err }
    }
  }

  // Generate tasks from a job
  const generateTasksFromJob = async (jobId, dueDate) => {
    try {
      loading.value = true
      error.value = null

      // Fetch job tasks for this job
      const { data: jobTasks, error: jobTasksError } = await supabase
        .from('job_tasks')
        .select('*')
        .eq('job_id', jobId)
        .order('order_index', { ascending: true })

      if (jobTasksError) throw jobTasksError

      if (!jobTasks || jobTasks.length === 0) {
        return { data: [], error: null }
      }

      // Generate tasks from job tasks
      const tasksToCreate = jobTasks.map(jobTask => ({
        job_id: jobId,
        job_task_id: jobTask.id,
        title: jobTask.title,
        description: jobTask.description || null,
        status: 'pending',
        time_window: jobTask.time_window || null,
        scheduled_time: jobTask.scheduled_time || null,
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
          jobs:job_id (
            id,
            name,
            description,
            requires_sequential
          ),
          job_tasks:job_task_id (
            id,
            order_index
          )
        `)

      if (createError) throw createError

      // Transform data
      const transformedTasks = createdTasks.map(task => {
        const jobName = task.jobs?.name || 'Unknown Job'
        
        return {
          ...task,
          job_name: jobName,
          job_id: task.jobs?.id,
          job_requires_sequential: task.jobs?.requires_sequential || false,
          job_task_order_index: task.job_tasks?.order_index || null
        }
      })

      // Add to local state
      tasks.value.push(...transformedTasks)

      return { data: transformedTasks, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error generating tasks from job:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Generate tasks for a job based on interval
  const generateTasksForJob = async (jobId, dueDate = null) => {
    try {
      const targetDate = dueDate || new Date().toISOString().split('T')[0]

      // Get job with interval
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('id, interval_days, status')
        .eq('id', jobId)
        .single()

      if (jobError) throw jobError

      if (job.status !== 'active') {
        return { data: [], error: null }
      }

      // Check last task generation date
      const { data: lastTasks } = await supabase
        .from('tasks')
        .select('due_date')
        .eq('job_id', jobId)
        .order('due_date', { ascending: false })
        .limit(1)

      let shouldGenerate = false

      if (!lastTasks || lastTasks.length === 0) {
        // No tasks yet, generate on first run
        shouldGenerate = true
      } else {
        const lastDate = new Date(lastTasks[0].due_date)
        const daysSince = Math.floor((new Date(targetDate) - lastDate) / (1000 * 60 * 60 * 24))
        shouldGenerate = daysSince >= job.interval_days
      }

      if (!shouldGenerate) {
        return { data: [], error: null } // Not time to generate yet
      }

      // Check if tasks already exist for this date
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('job_id', jobId)
        .eq('due_date', targetDate)
        .limit(1)

      if (existingTasks && existingTasks.length > 0) {
        return { data: [], error: null } // Tasks already exist for this date
      }

      // Generate tasks from job
      return await generateTasksFromJob(jobId, targetDate)
    } catch (err) {
      error.value = err.message
      console.error('Error generating tasks for job:', err)
      return { data: null, error: err }
    }
  }

  const generateDailyTasks = async (date = null) => {
    try {
      loading.value = true
      error.value = null

      const targetDate = date || new Date().toISOString().split('T')[0]

      const allGeneratedTasks = []

      // Get all active projects (lifecycle only - no daily/interval)
      const { data: activeProjects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          current_phase_id
        `)
        .eq('status', 'active')

      if (projectsError) throw projectsError

      // Generate tasks for active projects (lifecycle)
      if (activeProjects && activeProjects.length > 0) {
      for (const project of activeProjects) {
        if (!project.current_phase_id) continue

          // For lifecycle projects, only generate if no tasks exist for today
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

      // Get all active jobs and generate tasks based on intervals
      // Similar to how projects generate tasks from phases, jobs generate tasks from job_tasks
      const { data: activeJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, interval_days')
        .eq('status', 'active')

      if (jobsError) throw jobsError

      // Generate tasks for ALL active jobs (each job checks its own interval)
      // This processes every active job and generates tasks if the interval has passed
      if (activeJobs && activeJobs.length > 0) {
        for (const job of activeJobs) {
          // generateTasksForJob will check the interval and generate tasks from all job_tasks
          // if it's time to generate based on the job's interval_days
          const result = await generateTasksForJob(job.id, targetDate)
          if (result.data) {
            allGeneratedTasks.push(...result.data)
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

  // Generate tasks by category (for login workflow)
  const generateTasksByCategory = async (category, date = null) => {
    try {
      loading.value = true
      error.value = null

      const targetDate = date || new Date().toISOString().split('T')[0]
      const allGeneratedTasks = []

      // Get all active jobs
      const { data: activeJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, interval_days, name')
        .eq('status', 'active')

      if (jobsError) throw jobsError

      if (!activeJobs || activeJobs.length === 0) {
        return { data: [], error: null }
      }

      // Filter jobs by category based on job name
      const categoryKeywords = {
        'open_shop': ['open shop', 'open', 'start'],
        'close_shop': ['close shop', 'close up shop', 'close', 'end', 'shutdown']
      }

      const keywords = categoryKeywords[category] || []
      const filteredJobs = activeJobs.filter(job => {
        const jobNameLower = job.name.toLowerCase()
        return keywords.some(keyword => jobNameLower.includes(keyword))
      })

      // Generate tasks for filtered jobs
      for (const job of filteredJobs) {
        // For login workflow, generate tasks regardless of interval
        // Check if tasks already exist for this date and job
        const { data: existingTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('job_id', job.id)
          .eq('due_date', targetDate)
          .limit(1)

        if (!existingTasks || existingTasks.length === 0) {
          const result = await generateTasksFromJob(job.id, targetDate)
          if (result.data) {
            allGeneratedTasks.push(...result.data)
          }
        }
      }

      return { data: allGeneratedTasks, error: null }
    } catch (err) {
      error.value = err.message
      console.error(`Error generating ${category} tasks:`, err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Generate regular tasks (excluding Open Shop and Close Up Shop)
  const generateRegularTasks = async (date = null) => {
    try {
      loading.value = true
      error.value = null

      const targetDate = date || new Date().toISOString().split('T')[0]
      const allGeneratedTasks = []

      // Get all active projects (lifecycle)
      const { data: activeProjects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          current_phase_id
        `)
        .eq('status', 'active')

      if (projectsError) throw projectsError

      // Generate tasks for active projects
      if (activeProjects && activeProjects.length > 0) {
        for (const project of activeProjects) {
          if (!project.current_phase_id) continue

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

      // Get all active jobs
      const { data: activeJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, interval_days, name')
        .eq('status', 'active')

      if (jobsError) throw jobsError

      // Generate tasks for jobs (excluding Open Shop and Close Up Shop)
      if (activeJobs && activeJobs.length > 0) {
        const excludeKeywords = ['open shop', 'open', 'start', 'close shop', 'close up shop', 'close', 'end', 'shutdown']
        
        for (const job of activeJobs) {
          const jobNameLower = job.name.toLowerCase()
          const isExcluded = excludeKeywords.some(keyword => jobNameLower.includes(keyword))
          
          if (!isExcluded) {
            const result = await generateTasksForJob(job.id, targetDate)
            if (result.data) {
              allGeneratedTasks.push(...result.data)
            }
          }
        }
      }

      return { data: allGeneratedTasks, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error generating regular tasks:', err)
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
    generateTasksFromJob,
    generateTasksForJob,
    generateDailyTasks,
    generateTasksByCategory,
    generateRegularTasks,
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

