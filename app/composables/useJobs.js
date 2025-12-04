export const useJobs = () => {
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  
  const jobs = useState('jobs', () => [])
  const loading = useState('jobsLoading', () => false)
  const error = useState('jobsError', () => null)

  // Computed getters
  const activeJobs = computed(() => {
    return jobs.value.filter(j => j.status === 'active')
  })

  const jobById = computed(() => {
    return (id) => jobs.value.find(j => j.id === id)
  })

  // Supabase operations - Jobs
  const fetchJobs = async (options = {}) => {
    try {
      loading.value = true
      error.value = null
      
      let query = supabase
        .from('jobs')
        .select(`
          *,
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

      jobs.value = data
      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching jobs:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const fetchJobById = async (jobId) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select(`
          *,
          tanks:tank_id (
            id,
            name
          ),
          job_tasks (
            *
          )
        `)
        .eq('id', jobId)
        .single()

      if (fetchError) throw fetchError

      // Transform data to include tank name
      const transformedJob = {
        ...data,
        tank_name: data.tanks?.name || null
      }

      // Update in jobs array if it exists
      const index = jobs.value.findIndex(j => j.id === jobId)
      if (index !== -1) {
        jobs.value[index] = transformedJob
      } else {
        jobs.value.push(transformedJob)
      }

      return { data: transformedJob, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching job:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const createJob = async (jobData) => {
    try {
      loading.value = true
      error.value = null

      const jobToCreate = {
        ...jobData,
        created_by: user.value?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error: createError } = await supabase
        .from('jobs')
        .insert(jobToCreate)
        .select(`
          *,
          tanks:tank_id (
            id,
            name
          )
        `)
        .single()

      if (createError) throw createError

      // Transform data to include tank name
      const transformedJob = {
        ...data,
        tank_name: data.tanks?.name || null
      }

      jobs.value.unshift(transformedJob)
      return { data: transformedJob, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error creating job:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updateJob = async (jobId, updates) => {
    try {
      loading.value = true
      error.value = null

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      const { data, error: updateError } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .select(`
          *,
          tanks:tank_id (
            id,
            name
          )
        `)
        .single()

      if (updateError) throw updateError

      // Transform data to include tank name
      const transformedJob = {
        ...data,
        tank_name: data.tanks?.name || null
      }

      const index = jobs.value.findIndex(j => j.id === jobId)
      if (index !== -1) {
        jobs.value[index] = transformedJob
      }

      return { data: transformedJob, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error updating job:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const deleteJob = async (jobId) => {
    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)

      if (deleteError) throw deleteError

      jobs.value = jobs.value.filter(j => j.id !== jobId)
      return { error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting job:', err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  // Supabase operations - Job Tasks
  const fetchJobTasks = async (jobId) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('job_tasks')
        .select('*')
        .eq('job_id', jobId)
        .order('order_index', { ascending: true })

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching job tasks:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const createJobTask = async (taskData) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: createError } = await supabase
        .from('job_tasks')
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
      console.error('Error creating job task:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updateJobTask = async (taskId, updates) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('job_tasks')
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
      console.error('Error updating job task:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const deleteJobTask = async (taskId) => {
    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('job_tasks')
        .delete()
        .eq('id', taskId)

      if (deleteError) throw deleteError

      return { error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting job task:', err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  // Local state management
  const setJobs = (newJobs) => {
    jobs.value = newJobs
  }

  const addJob = (job) => {
    jobs.value.push(job)
  }

  const removeJob = (jobId) => {
    jobs.value = jobs.value.filter(j => j.id !== jobId)
  }

  const setLoading = (isLoading) => {
    loading.value = isLoading
  }

  const setError = (err) => {
    error.value = err
  }

  return {
    // State
    jobs: readonly(jobs),
    loading: readonly(loading),
    error: readonly(error),
    // Getters
    activeJobs,
    jobById,
    // Supabase operations - Jobs
    fetchJobs,
    fetchJobById,
    createJob,
    updateJob,
    deleteJob,
    // Supabase operations - Job Tasks
    fetchJobTasks,
    createJobTask,
    updateJobTask,
    deleteJobTask,
    // Local state management
    setJobs,
    addJob,
    removeJob,
    setLoading,
    setError
  }
}

