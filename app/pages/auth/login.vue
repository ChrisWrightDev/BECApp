<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200">
    <div class="card w-full max-w-md bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title justify-center text-2xl mb-4">BEC Aquaculture</h2>
        <p class="text-center text-base-content/70 mb-6">Sign in to your account</p>

        <div v-if="error" class="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ error }}</span>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
              v-model="email"
              type="email"
              placeholder="email@example.com"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Password</span>
            </label>
            <input
              v-model="password"
              type="password"
              placeholder="Password"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control mt-6">
            <button
              type="submit"
              class="btn btn-primary w-full"
              :class="{ 'loading': loading }"
              :disabled="loading"
            >
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'guest',
  layout: false
})

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const { signIn } = useAuth()
const { recordLogin } = useSessions()
const { generateTasksByCategory, generateRegularTasks } = useTasks()
const supabase = useSupabaseClient()
const router = useRouter()

// Check if we're in the middle of a shift (Open Shop completed, Close Up Shop pending)
const isMidShift = async (date) => {
  try {
    // Get all active jobs
    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('id, name')
      .eq('status', 'active')

    if (!activeJobs || activeJobs.length === 0) {
      return false
    }

    // Find Open Shop and Close Up Shop jobs
    const openShopKeywords = ['open shop', 'open', 'start']
    const closeShopKeywords = ['close shop', 'close up shop', 'close', 'end', 'shutdown']
    
    const openShopJobs = activeJobs.filter(job => {
      const jobNameLower = job.name.toLowerCase()
      return openShopKeywords.some(keyword => jobNameLower.includes(keyword))
    })
    
    const closeShopJobs = activeJobs.filter(job => {
      const jobNameLower = job.name.toLowerCase()
      return closeShopKeywords.some(keyword => jobNameLower.includes(keyword))
    })

    if (openShopJobs.length === 0 || closeShopJobs.length === 0) {
      return false // Can't determine shift status without both jobs
    }

    // Check if Open Shop tasks are completed
    const openShopJobIds = openShopJobs.map(j => j.id)
    const { data: openShopTasks } = await supabase
      .from('tasks')
      .select('id, status')
      .in('job_id', openShopJobIds)
      .eq('due_date', date)

    if (!openShopTasks || openShopTasks.length === 0) {
      return false // No Open Shop tasks exist, not mid-shift
    }

    const allOpenShopCompleted = openShopTasks.every(task => task.status === 'completed')
    if (!allOpenShopCompleted) {
      return false // Open Shop not completed, not mid-shift
    }

    // Check if Close Up Shop tasks are pending
    const closeShopJobIds = closeShopJobs.map(j => j.id)
    const { data: closeShopTasks } = await supabase
      .from('tasks')
      .select('id, status')
      .in('job_id', closeShopJobIds)
      .eq('due_date', date)

    if (!closeShopTasks || closeShopTasks.length === 0) {
      return false // No Close Shop tasks exist, not mid-shift
    }

    const hasPendingCloseShop = closeShopTasks.some(task => 
      task.status === 'pending' || task.status === 'in_progress'
    )

    // Mid-shift if Open Shop is completed AND Close Shop has pending tasks
    return hasPendingCloseShop
  } catch (err) {
    console.error('Error checking mid-shift status:', err)
    return false // On error, allow task generation
  }
}

const handleLogin = async () => {
  error.value = ''
  loading.value = true

  try {
    const { data, error: authError } = await signIn(email.value, password.value)
    
    if (authError) {
      error.value = authError.message || 'Invalid email or password'
      loading.value = false
      return
    }

    if (data) {
      // Record login time for payroll
      await recordLogin()
      
      // Wait a tick to ensure state is updated
      await nextTick()
      
      // Check if we're logging in mid-shift
      const today = new Date().toISOString().split('T')[0]
      const midShift = await isMidShift(today)
      
      if (midShift) {
        // User is logging in mid-shift - don't generate tasks
        // Just navigate to dashboard
        await router.push('/')
      } else {
        // Normal login - generate tasks in the correct order
        // 1. Generate "Open Shop" tasks
        await generateTasksByCategory('open_shop', today)
        
        // 2. Generate all regular daily tasks (excluding Open Shop and Close Up Shop)
        await generateRegularTasks(today)
        
        // 3. Generate "Close Up Shop" tasks
        await generateTasksByCategory('close_shop', today)
        
        // Navigate to dashboard
      await router.push('/')
      }
    }
  } catch (err) {
    error.value = err.message || 'An error occurred during login'
  } finally {
    loading.value = false
  }
}
</script>

