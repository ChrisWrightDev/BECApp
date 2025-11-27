export const usePairs = () => {
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  
  const tanks = useState('tanks', () => [])
  const matedPairs = useState('matedPairs', () => [])
  const hatches = useState('hatches', () => [])
  const loading = useState('pairsLoading', () => false)
  const error = useState('pairsError', () => null)

  // Computed getters
  const activeTanks = computed(() => {
    return tanks.value.filter(t => t.status === 'active')
  })

  const activePairs = computed(() => {
    return matedPairs.value.filter(p => p.status === 'active')
  })

  const pairsByTank = computed(() => {
    const grouped = {}
    matedPairs.value.forEach(pair => {
      const tankId = pair.tank_id || 'no-tank'
      if (!grouped[tankId]) {
        grouped[tankId] = []
      }
      grouped[tankId].push(pair)
    })
    return grouped
  })

  const hatchesByPair = computed(() => {
    const grouped = {}
    hatches.value.forEach(hatch => {
      if (!grouped[hatch.pair_id]) {
        grouped[hatch.pair_id] = []
      }
      grouped[hatch.pair_id].push(hatch)
    })
    return grouped
  })

  // Supabase operations - Tanks
  const fetchTanks = async (options = {}) => {
    try {
      loading.value = true
      error.value = null
      
      let query = supabase
        .from('tanks')
        .select('*')
        .order('name', { ascending: true })

      if (options.status) {
        query = query.eq('status', options.status)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      tanks.value = data
      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching tanks:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const createTank = async (tankData) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: createError } = await supabase
        .from('tanks')
        .insert({
          ...tankData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) throw createError

      tanks.value.push(data)
      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error creating tank:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updateTank = async (tankId, updates) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('tanks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', tankId)
        .select()
        .single()

      if (updateError) throw updateError

      const index = tanks.value.findIndex(t => t.id === tankId)
      if (index !== -1) {
        tanks.value[index] = data
      }

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error updating tank:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const deleteTank = async (tankId) => {
    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('tanks')
        .delete()
        .eq('id', tankId)

      if (deleteError) throw deleteError

      tanks.value = tanks.value.filter(t => t.id !== tankId)
      return { error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting tank:', err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  // Supabase operations - Mated Pairs
  const fetchPairs = async (options = {}) => {
    try {
      loading.value = true
      error.value = null
      
      let query = supabase
        .from('mated_pairs')
        .select(`
          *,
          tanks:tank_id (
            id,
            name,
            capacity_gallons
          )
        `)
        .order('paired_date', { ascending: false })

      if (options.status) {
        query = query.eq('status', options.status)
      }

      if (options.tankId) {
        query = query.eq('tank_id', options.tankId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Transform data
      const transformedPairs = data.map(pair => ({
        ...pair,
        tank_name: pair.tanks?.name || 'No Tank',
        tank_capacity: pair.tanks?.capacity_gallons
      }))

      matedPairs.value = transformedPairs
      return { data: transformedPairs, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching pairs:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const createPair = async (pairData) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: createError } = await supabase
        .from('mated_pairs')
        .insert({
          ...pairData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          tanks:tank_id (
            id,
            name,
            capacity_gallons
          )
        `)
        .single()

      if (createError) throw createError

      const transformedPair = {
        ...data,
        tank_name: data.tanks?.name || 'No Tank',
        tank_capacity: data.tanks?.capacity_gallons
      }

      matedPairs.value.unshift(transformedPair)
      return { data: transformedPair, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error creating pair:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updatePair = async (pairId, updates) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('mated_pairs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', pairId)
        .select(`
          *,
          tanks:tank_id (
            id,
            name,
            capacity_gallons
          )
        `)
        .single()

      if (updateError) throw updateError

      const transformedPair = {
        ...data,
        tank_name: data.tanks?.name || 'No Tank',
        tank_capacity: data.tanks?.capacity_gallons
      }

      const index = matedPairs.value.findIndex(p => p.id === pairId)
      if (index !== -1) {
        matedPairs.value[index] = transformedPair
      }

      return { data: transformedPair, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error updating pair:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const deletePair = async (pairId) => {
    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('mated_pairs')
        .delete()
        .eq('id', pairId)

      if (deleteError) throw deleteError

      matedPairs.value = matedPairs.value.filter(p => p.id !== pairId)
      return { error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting pair:', err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  // Supabase operations - Hatches
  const fetchHatches = async (pairId = null) => {
    try {
      loading.value = true
      error.value = null
      
      let query = supabase
        .from('hatches')
        .select('*')
        .order('hatch_date', { ascending: false })

      if (pairId) {
        query = query.eq('pair_id', pairId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      hatches.value = data
      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching hatches:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const createHatch = async (hatchData) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: createError } = await supabase
        .from('hatches')
        .insert({
          ...hatchData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) throw createError

      hatches.value.unshift(data)
      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error creating hatch:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updateHatch = async (hatchId, updates) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('hatches')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', hatchId)
        .select()
        .single()

      if (updateError) throw updateError

      const index = hatches.value.findIndex(h => h.id === hatchId)
      if (index !== -1) {
        hatches.value[index] = data
      }

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error updating hatch:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const deleteHatch = async (hatchId) => {
    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('hatches')
        .delete()
        .eq('id', hatchId)

      if (deleteError) throw deleteError

      hatches.value = hatches.value.filter(h => h.id !== hatchId)
      return { error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting hatch:', err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    tanks: readonly(tanks),
    matedPairs: readonly(matedPairs),
    hatches: readonly(hatches),
    loading: readonly(loading),
    error: readonly(error),
    // Getters
    activeTanks,
    activePairs,
    pairsByTank,
    hatchesByPair,
    // Tank operations
    fetchTanks,
    createTank,
    updateTank,
    deleteTank,
    // Pair operations
    fetchPairs,
    createPair,
    updatePair,
    deletePair,
    // Hatch operations
    fetchHatches,
    createHatch,
    updateHatch,
    deleteHatch
  }
}


