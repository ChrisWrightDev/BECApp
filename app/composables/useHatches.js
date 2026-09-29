import { withTimeout } from '~/utils/loadState'

const CLOSED_STATUSES = ['completed', 'failed', 'archived']

const HATCH_SELECT = `
  *,
  pair:mated_pairs!pair_id (
    id,
    male_species,
    female_species
  ),
  parent_tank:tanks!parent_tank_id (
    id,
    name,
    label
  ),
  hatch_tank:tanks!hatch_tank_id (
    id,
    name,
    label
  ),
  current_tank:tanks!current_tank_id (
    id,
    name,
    label
  )
`

const formatDate = (value) => {
  if (!value) return null
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Chicago'
  }).format(date)
}

const daysSince = (value) => {
  if (!value) return null
  const laid = new Date(`${value}T12:00:00`)
  if (Number.isNaN(laid.getTime())) return null
  const today = new Date()
  const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const laidNoon = new Date(laid.getFullYear(), laid.getMonth(), laid.getDate())
  return Math.max(0, Math.round((todayNoon - laidNoon) / 86400000))
}

const tankLabel = (tank, ...fallbacks) => {
  return tank?.label || tank?.name || fallbacks.find(Boolean) || null
}

const pairName = (hatch) => {
  if (hatch?.pair?.male_species || hatch?.pair?.female_species) {
    const male = hatch.pair.male_species || 'Unknown'
    const female = hatch.pair.female_species || 'Unknown'
    return `${male} × ${female}`
  }
  return hatch?.metadata?.pair_name || null
}

const estimatedCount = (hatch) => {
  const values = [hatch.current_count, hatch.hatch_count, hatch.initial_egg_count]
  return values.find((value) => typeof value === 'number') ?? 0
}

const normalizeTransferHistory = (history) => {
  if (!Array.isArray(history)) return []
  return history.map((entry) => ({
    date: entry?.date || null,
    dateLabel: formatDate(entry?.date),
    from: entry?.from || null,
    to: entry?.to || null,
    count: typeof entry?.count === 'number' ? entry.count : null,
    notes: entry?.notes || null
  }))
}

const enrichHatch = (row) => {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  return {
    ...row,
    metadata,
    pairName: pairName({ ...row, metadata }),
    parentTankLabel: tankLabel(
      row.parent_tank,
      metadata.parent_tank_label,
      row.transfer_from_tank_label
    ),
    hatchTankLabel: tankLabel(row.hatch_tank, metadata.hatch_tank_label),
    currentTankLabel: tankLabel(
      row.current_tank,
      metadata.current_tank_label,
      row.transfer_to_tank_label
    ),
    eggLaidLabel: formatDate(row.egg_laid_date),
    hatchDateLabel: formatDate(row.hatch_date),
    firstFeedLabel: formatDate(row.first_feed_date),
    transferDateLabel: formatDate(row.transfer_date),
    growoutDateLabel: formatDate(row.growout_date),
    readyForSaleLabel: formatDate(row.ready_for_sale_date),
    daysSinceLaid: daysSince(row.egg_laid_date),
    estimatedCount: estimatedCount(row),
    qualityFlags: Array.isArray(row.quality_flags) ? row.quality_flags : [],
    transferHistory: normalizeTransferHistory(row.transfer_history)
  }
}

const isCurrentStatus = (status) => !CLOSED_STATUSES.includes(status)

export const useHatches = () => {
  const supabase = useSupabaseClient()
  const hatches = useState('hatchBatches', () => [])
  const loading = useState('hatchesLoading', () => false)
  const error = useState('hatchesError', () => null)

  const currentHatches = computed(() =>
    hatches.value.filter((hatch) => isCurrentStatus(hatch.status))
  )

  const hatchesForPair = (pairId) => {
    if (!pairId) return []
    return (hatches.value || []).filter((hatch) => hatch.pair_id === pairId)
  }

  const summaryStats = computed(() => {
    const items = currentHatches.value
    const byStage = {}
    items.forEach((hatch) => {
      const stage = hatch.stage || 'unknown'
      byStage[stage] = (byStage[stage] || 0) + 1
    })
    return {
      activeCount: items.length,
      totalEstimate: items.reduce((sum, hatch) => sum + (hatch.estimatedCount || 0), 0),
      byStage
    }
  })

  const fetchHatches = async () => {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await withTimeout(
        supabase
          .from('hatch_batches')
          .select(HATCH_SELECT)
          .order('egg_laid_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
      )

      if (fetchError) {
        const { data: fallback, error: fallbackError } = await withTimeout(
          supabase
            .from('hatch_batches')
            .select('*')
            .order('egg_laid_date', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
        )
        if (fallbackError) throw fetchError
        hatches.value = (fallback || []).map(enrichHatch)
        return { data: hatches.value, error: null }
      }

      hatches.value = (data || []).map(enrichHatch)
      return { data: hatches.value, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching hatch batches:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const fetchHatchById = async (id) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await withTimeout(
        supabase
          .from('hatch_batches')
          .select(HATCH_SELECT)
          .eq('id', id)
          .maybeSingle()
      )

      if (fetchError) {
        const { data: fallback, error: fallbackError } = await withTimeout(
          supabase
            .from('hatch_batches')
            .select('*')
            .eq('id', id)
            .maybeSingle()
        )
        if (fallbackError) throw fetchError
        return { data: fallback ? enrichHatch(fallback) : null, error: null }
      }

      return { data: data ? enrichHatch(data) : null, error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching hatch batch:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  return {
    hatches: readonly(hatches),
    currentHatches,
    hatchesForPair,
    summaryStats,
    loading: readonly(loading),
    error: readonly(error),
    fetchHatches,
    fetchHatchById,
    isCurrentStatus,
    formatDate
  }
}
