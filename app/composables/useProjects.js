export const useProjects = () => {
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  
  const projects = useState('projects', () => [])
  const templates = useState('templates', () => [])
  const phases = useState('phases', () => [])
  const loading = useState('projectsLoading', () => false)
  const error = useState('projectsError', () => null)
  const activeProject = useState('activeProject', () => null)

  // Computed getters
  const activeProjects = computed(() => {
    return projects.value.filter(p => p.status === 'active')
  })

  const completedProjects = computed(() => {
    return projects.value.filter(p => p.status === 'completed')
  })

  const projectById = computed(() => {
    return (id) => projects.value.find(p => p.id === id)
  })

  const templateById = computed(() => {
    return (id) => templates.value.find(t => t.id === id)
  })

  // Supabase operations - Project History (defined early for use in project functions)
  const addProjectHistory = async (projectId, action, phaseId = null, metadata = null) => {
    try {
      const { data, error: insertError } = await supabase
        .from('project_history')
        .insert({
          project_id: projectId,
          phase_id: phaseId,
          action,
          metadata: metadata || {},
          created_by: user.value?.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) throw insertError

      return { data, error: null }
    } catch (err) {
      console.error('Error adding project history:', err)
      return { data: null, error: err }
    }
  }

  // Supabase operations - Projects
  const fetchProjects = async (options = {}) => {
    try {
      loading.value = true
      error.value = null
      
      let query = supabase
        .from('projects')
        .select(`
          *,
          templates:template_id (
            id,
            name,
            type
          ),
          phases:current_phase_id (
            id,
            name,
            order_index
          ),
          tanks:tank_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (options.status) {
        query = query.eq('status', options.status)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Transform data
      const transformedProjects = data.map(project => ({
        ...project,
        template_name: project.templates?.name || 'Unknown Template',
        template_type: project.templates?.type,
        current_phase: project.phases?.name || 'No Phase',
        current_phase_order: project.phases?.order_index,
        tank_name: project.tanks?.name || null
      }))

      projects.value = transformedProjects
      return { data: transformedProjects, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching projects:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const fetchProjectById = async (projectId) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('projects')
        .select(`
          *,
          templates:template_id (
            id,
            name,
            type
          ),
          phases:current_phase_id (
            id,
            name,
            order_index
          ),
          tanks:tank_id (
            id,
            name
          )
        `)
        .eq('id', projectId)
        .single()

      if (fetchError) throw fetchError

      // Transform data
      const transformedProject = {
        ...data,
        template_name: data.templates?.name || 'Unknown Template',
        template_type: data.templates?.type,
        current_phase: data.phases?.name || 'No Phase',
        current_phase_order: data.phases?.order_index,
        tank_name: data.tanks?.name || null
      }

      // Update in projects array if it exists
      const index = projects.value.findIndex(p => p.id === projectId)
      if (index !== -1) {
        projects.value[index] = transformedProject
      } else {
        projects.value.push(transformedProject)
      }

      return { data: transformedProject, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching project:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const createProject = async (projectData) => {
    try {
      loading.value = true
      error.value = null

      // If no phase is specified, get the first phase of the template
      let currentPhaseId = projectData.current_phase_id
      
      if (!currentPhaseId && projectData.template_id) {
        const { data: phases, error: phasesError } = await supabase
          .from('phases')
          .select('id')
          .eq('template_id', projectData.template_id)
          .order('order_index', { ascending: true })
          .limit(1)

        if (!phasesError && phases && phases.length > 0) {
          currentPhaseId = phases[0].id
        }
      }

      const projectToCreate = {
        ...projectData,
        current_phase_id: currentPhaseId,
        created_by: user.value?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error: createError } = await supabase
        .from('projects')
        .insert(projectToCreate)
        .select(`
          *,
          templates:template_id (
            id,
            name,
            type
          ),
          phases:current_phase_id (
            id,
            name,
            order_index
          ),
          tanks:tank_id (
            id,
            name
          )
        `)
        .single()

      if (createError) throw createError

      const transformedProject = {
        ...data,
        template_name: data.templates?.name || 'Unknown Template',
        template_type: data.templates?.type,
        current_phase: data.phases?.name || 'No Phase',
        current_phase_order: data.phases?.order_index,
        tank_name: data.tanks?.name || null
      }

      projects.value.unshift(transformedProject)

      // Record initial phase start in history
      if (data.current_phase_id) {
        await addProjectHistory(data.id, 'phase_started', data.current_phase_id, {
          initial_phase: true
        })
      }
      await addProjectHistory(data.id, 'project_created', null, {
        template_id: data.template_id
      })

      return { data: transformedProject, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error creating project:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updateProject = async (projectId, updates) => {
    try {
      loading.value = true
      error.value = null

      // Get current project state to detect changes
      const { data: currentProject } = await supabase
        .from('projects')
        .select('current_phase_id, status')
        .eq('id', projectId)
        .single()

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      // If completing project, set completion date
      if (updates.status === 'completed' && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString()
      }

      const { data, error: updateError } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select(`
          *,
          templates:template_id (
            id,
            name,
            type
          ),
          phases:current_phase_id (
            id,
            name,
            order_index
          ),
          tanks:tank_id (
            id,
            name
          )
        `)
        .single()

      if (updateError) throw updateError

      // Record history for phase changes
      if (updates.current_phase_id && updates.current_phase_id !== currentProject?.current_phase_id) {
        if (currentProject?.current_phase_id) {
          await addProjectHistory(projectId, 'phase_completed', currentProject.current_phase_id, {
            manual_change: true
          })
        }
        await addProjectHistory(projectId, 'phase_started', updates.current_phase_id, {
          manual_change: true
        })
      }

      // Record history for status changes
      if (updates.status && updates.status !== currentProject?.status) {
        await addProjectHistory(projectId, 'status_changed', null, {
          old_status: currentProject?.status,
          new_status: updates.status,
          manual_change: true
        })
      }

      const transformedProject = {
        ...data,
        template_name: data.templates?.name || 'Unknown Template',
        template_type: data.templates?.type,
        current_phase: data.phases?.name || 'No Phase',
        current_phase_order: data.phases?.order_index,
        tank_name: data.tanks?.name || null
      }

      const index = projects.value.findIndex(p => p.id === projectId)
      if (index !== -1) {
        projects.value[index] = transformedProject
      }

      return { data: transformedProject, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error updating project:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const deleteProject = async (projectId) => {
    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (deleteError) throw deleteError

      projects.value = projects.value.filter(p => p.id !== projectId)
      return { error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting project:', err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  // Supabase operations - Templates
  const fetchTemplates = async () => {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('templates')
        .select('*')
        .order('name', { ascending: true })

      if (fetchError) throw fetchError

      templates.value = data
      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching templates:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const createTemplate = async (templateData) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: createError } = await supabase
        .from('templates')
        .insert({
          ...templateData,
          created_by: user.value?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) throw createError

      templates.value.push(data)
      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error creating template:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updateTemplate = async (templateId, updates) => {
    try {
      loading.value = true
      error.value = null

      // Validate templateId
      if (!templateId || templateId === 'undefined') {
        throw new Error('Template ID is required for update')
      }

      const { data, error: updateError } = await supabase
        .from('templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .select()
        .single()

      if (updateError) throw updateError

      const index = templates.value.findIndex(t => t.id === templateId)
      if (index !== -1) {
        templates.value[index] = data
      }

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error updating template:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const deleteTemplate = async (templateId) => {
    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId)

      if (deleteError) throw deleteError

      templates.value = templates.value.filter(t => t.id !== templateId)
      return { error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting template:', err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  // Supabase operations - Phases
  const fetchPhases = async (templateId) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('phases')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index', { ascending: true })

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching phases:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const createPhase = async (phaseData) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: createError } = await supabase
        .from('phases')
        .insert({
          ...phaseData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) throw createError

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error creating phase:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updatePhase = async (phaseId, updates) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('phases')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', phaseId)
        .select()
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error updating phase:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const deletePhase = async (phaseId) => {
    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('phases')
        .delete()
        .eq('id', phaseId)

      if (deleteError) throw deleteError

      return { error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting phase:', err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  // Supabase operations - Phase Tasks
  const fetchPhaseTasks = async (phaseId) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('phase_tasks')
        .select('*')
        .eq('phase_id', phaseId)
        .order('order_index', { ascending: true })

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching phase tasks:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const createPhaseTask = async (taskData) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: createError } = await supabase
        .from('phase_tasks')
        .insert({
          ...taskData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) throw createError

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error creating phase task:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updatePhaseTask = async (taskId, updates) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('phase_tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error updating phase task:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const deletePhaseTask = async (taskId) => {
    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('phase_tasks')
        .delete()
        .eq('id', taskId)

      if (deleteError) throw deleteError

      return { error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting phase task:', err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  // Supabase operations - Project History
  const fetchProjectHistory = async (projectId) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('project_history')
        .select(`
          *,
          phases:phase_id (
            id,
            name,
            order_index
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Transform data
      const transformedHistory = data.map(entry => ({
        ...entry,
        phase_name: entry.phases?.name || null
      }))

      return { data: transformedHistory, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching project history:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Automatic phase advancement
  const checkAndAdvancePhases = async () => {
    try {
      loading.value = true
      error.value = null

      // Get all active projects with their current phase
      const { data: activeProjects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          current_phase_id,
          started_at,
          phases:current_phase_id (
            id,
            duration_days,
            template_id,
            order_index
          ),
          templates:template_id (
            id
          )
        `)
        .eq('status', 'active')

      if (projectsError) throw projectsError

      if (!activeProjects || activeProjects.length === 0) {
        return { data: [], error: null }
      }

      const advancedProjects = []

      for (const project of activeProjects) {
        if (!project.current_phase_id || !project.phases?.duration_days) {
          continue // Skip projects without phases or without duration
        }

        // Get when the phase started (from project history)
        const { data: phaseHistory } = await supabase
          .from('project_history')
          .select('created_at')
          .eq('project_id', project.id)
          .eq('phase_id', project.current_phase_id)
          .eq('action', 'phase_started')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const phaseStartDate = phaseHistory?.created_at || project.started_at
        const daysInPhase = Math.floor(
          (new Date() - new Date(phaseStartDate)) / (1000 * 60 * 60 * 24)
        )

        if (daysInPhase >= project.phases.duration_days) {
          // Get next phase
          const { data: nextPhase } = await supabase
            .from('phases')
            .select('id, name, order_index')
            .eq('template_id', project.templates.id)
            .gt('order_index', project.phases.order_index)
            .order('order_index', { ascending: true })
            .limit(1)
            .single()

          if (nextPhase) {
            // Advance to next phase
            await updateProject(project.id, { current_phase_id: nextPhase.id })
            
            // Record history
            await addProjectHistory(project.id, 'phase_completed', project.current_phase_id, {
              days_in_phase: daysInPhase,
              auto_advanced: true
            })
            await addProjectHistory(project.id, 'phase_started', nextPhase.id, {
              auto_advanced: true
            })

            advancedProjects.push({
              projectId: project.id,
              fromPhase: project.phases.id,
              toPhase: nextPhase.id
            })
          } else {
            // No more phases - project complete
            await updateProject(project.id, { 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            await addProjectHistory(project.id, 'project_completed', null, {
              auto_completed: true
            })
          }
        }
      }

      return { data: advancedProjects, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error checking phase advancement:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Local state management
  const setProjects = (newProjects) => {
    projects.value = newProjects
  }

  const addProject = (project) => {
    projects.value.push(project)
  }

  const removeProject = (projectId) => {
    projects.value = projects.value.filter(p => p.id !== projectId)
  }

  const setTemplates = (newTemplates) => {
    templates.value = newTemplates
  }

  const addTemplate = (template) => {
    templates.value.push(template)
  }

  const removeTemplate = (templateId) => {
    templates.value = templates.value.filter(t => t.id !== templateId)
  }

  const setActiveProject = (project) => {
    activeProject.value = project
  }

  const setLoading = (isLoading) => {
    loading.value = isLoading
  }

  const setError = (err) => {
    error.value = err
  }

  return {
    // State
    projects: readonly(projects),
    templates: readonly(templates),
    phases: readonly(phases),
    loading: readonly(loading),
    error: readonly(error),
    activeProject: readonly(activeProject),
    // Getters
    activeProjects,
    completedProjects,
    projectById,
    templateById,
    // Supabase operations - Projects
    fetchProjects,
    fetchProjectById,
    createProject,
    updateProject,
    deleteProject,
    // Supabase operations - Templates
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    // Supabase operations - Phases
    fetchPhases,
    createPhase,
    updatePhase,
    deletePhase,
    // Supabase operations - Phase Tasks
    fetchPhaseTasks,
    createPhaseTask,
    updatePhaseTask,
    deletePhaseTask,
    // Supabase operations - Project History
    fetchProjectHistory,
    addProjectHistory,
    checkAndAdvancePhases,
    // Local state management
    setProjects,
    addProject,
    removeProject,
    setTemplates,
    addTemplate,
    updateTemplate,
    removeTemplate,
    setActiveProject,
    setLoading,
    setError
  }
}

