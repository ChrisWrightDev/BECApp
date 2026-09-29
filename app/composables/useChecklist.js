import { withTimeout } from '~/utils/loadState'

export const useChecklist = () => {
  const supabase = useSupabaseClient()
  const { user } = useAuth()

  const checklistDay = useState('checklistDay', () => null)
  const checklistItems = useState('checklistItems', () => [])
  const loading = useState('checklistLoading', () => false)
  const error = useState('checklistError', () => null)

  // Computed: group items by block
  const itemsByBlock = computed(() => {
    const grouped = {
      pre_morning: [],
      morning: [],
      midday: [],
      afternoon: [],
      evening: []
    }
    checklistItems.value.forEach(item => {
      if (grouped[item.block]) {
        grouped[item.block].push(item)
      }
    })
    // Sort by sort_order within each block
    Object.keys(grouped).forEach(block => {
      grouped[block].sort((a, b) => a.sort_order - b.sort_order)
    })
    return grouped
  })

  // Computed: progress counts
  const progressByBlock = computed(() => {
    const progress = {}
    Object.keys(itemsByBlock.value).forEach(block => {
      const items = itemsByBlock.value[block]
      progress[block] = {
        total: items.length,
        done: items.filter(i => i.done).length
      }
    })
    return progress
  })

  const overallProgress = computed(() => {
    const total = checklistItems.value.length
    const done = checklistItems.value.filter(i => i.done).length
    return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
  })

  // Fetch today's checklist (America/Chicago date)
  const fetchTodayChecklist = async () => {
    try {
      loading.value = true
      error.value = null

      // Get today's date in America/Chicago timezone
      const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' })
      const [month, dayOfMonth, year] = today.split('/')
      const workDate = `${year}-${month}-${dayOfMonth}`

      // Fetch the published day for today
      const { data: day, error: dayError } = await withTimeout(
        supabase
          .from('checklist_days')
          .select('*')
          .eq('work_date', workDate)
          .eq('status', 'published')
          .maybeSingle()
      )

      if (dayError) {
        throw dayError
      }

      if (!day) {
        checklistDay.value = null
        checklistItems.value = []
        return { day: null, items: [], error: null }
      }

      checklistDay.value = day

      // Fetch items for this day
      const { data: items, error: itemsError } = await withTimeout(
        supabase
          .from('checklist_items')
          .select('*')
          .eq('day_id', day.id)
          .order('block', { ascending: true })
          .order('sort_order', { ascending: true })
      )

      if (itemsError) throw itemsError

      checklistItems.value = items || []
      return { day, items: items || [], error: null }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching checklist:', err)
      return { day: null, items: [], error: err }
    } finally {
      loading.value = false
    }
  }

  // Toggle item completion (optimistic update with rollback on error)
  const toggleItem = async (itemId) => {
    const item = checklistItems.value.find(i => i.id === itemId)
    if (!item) return { error: 'Item not found' }

    // Validation: if requires_value and not done, value_text must be filled
    if (!item.done && item.requires_value && !item.value_text) {
      return { error: 'Please enter a value before marking as done' }
    }

    // Store original state for rollback
    const originalDone = item.done
    const originalDoneAt = item.done_at
    const originalDoneBy = item.done_by

    // Optimistic update
    const newDone = !item.done
    item.done = newDone
    item.done_at = newDone ? new Date().toISOString() : null
    item.done_by = newDone ? user.value?.id : null

    try {
      // Update in database
      const { data, error: updateError } = await supabase
        .from('checklist_items')
        .update({
          done: newDone,
          done_at: newDone ? new Date().toISOString() : null,
          done_by: newDone ? user.value?.id : null
        })
        .eq('id', itemId)
        .select()
        .single()

      if (updateError) throw updateError

      // Update local state with server response
      Object.assign(item, data)
      return { data, error: null }
    } catch (err) {
      // Rollback on error
      item.done = originalDone
      item.done_at = originalDoneAt
      item.done_by = originalDoneBy
      console.error('Error toggling item:', err)
      return { data: null, error: err }
    }
  }

  // Update item value (for requires_value items like temperature)
  const updateItemValue = async (itemId, value) => {
    const item = checklistItems.value.find(i => i.id === itemId)
    if (!item) return { error: 'Item not found' }

    // Optimistic update
    const originalValue = item.value_text
    item.value_text = value

    try {
      const { data, error: updateError } = await supabase
        .from('checklist_items')
        .update({ value_text: value })
        .eq('id', itemId)
        .select()
        .single()

      if (updateError) throw updateError

      Object.assign(item, data)
      return { data, error: null }
    } catch (err) {
      // Rollback on error
      item.value_text = originalValue
      console.error('Error updating item value:', err)
      return { data: null, error: err }
    }
  }

  // Update item note
  const updateItemNote = async (itemId, note) => {
    const item = checklistItems.value.find(i => i.id === itemId)
    if (!item) return { error: 'Item not found' }

    // Optimistic update
    const originalNote = item.note
    item.note = note

    try {
      const { data, error: updateError } = await supabase
        .from('checklist_items')
        .update({ note })
        .eq('id', itemId)
        .select()
        .single()

      if (updateError) throw updateError

      Object.assign(item, data)
      return { data, error: null }
    } catch (err) {
      // Rollback on error
      item.note = originalNote
      console.error('Error updating item note:', err)
      return { data: null, error: err }
    }
  }

  // Subscribe to realtime updates
  const subscribeToRealtime = (dayId) => {
    if (!dayId) return null

    const channel = supabase
      .channel('checklist_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_items',
          filter: `day_id=eq.${dayId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            checklistItems.value.push(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            const index = checklistItems.value.findIndex(i => i.id === payload.new.id)
            if (index !== -1) {
              checklistItems.value[index] = payload.new
            }
          } else if (payload.eventType === 'DELETE') {
            checklistItems.value = checklistItems.value.filter(i => i.id !== payload.old.id)
          }
        }
      )
      .subscribe()

    return channel
  }

  const unsubscribeFromRealtime = (channel) => {
    if (channel) {
      supabase.removeChannel(channel)
    }
  }

  // Format block name for display
  const formatBlockName = (block) => {
    const names = {
      pre_morning: 'Pre-Morning',
      morning: 'Morning',
      midday: 'Midday',
      afternoon: 'Afternoon',
      evening: 'Evening'
    }
    return names[block] || block
  }

  // Get category badge color
  const getCategoryColor = (category) => {
    const colors = {
      feeding: 'badge-success',
      temp_check: 'badge-info',
      hatch_check: 'badge-warning',
      cleaning: 'badge-primary',
      move: 'badge-secondary',
      other: 'badge-ghost'
    }
    return colors[category] || 'badge-ghost'
  }

  return {
    // State
    checklistDay: readonly(checklistDay),
    checklistItems: readonly(checklistItems),
    loading: readonly(loading),
    error: readonly(error),
    // Computed
    itemsByBlock,
    progressByBlock,
    overallProgress,
    // Methods
    fetchTodayChecklist,
    toggleItem,
    updateItemValue,
    updateItemNote,
    subscribeToRealtime,
    unsubscribeFromRealtime,
    formatBlockName,
    getCategoryColor
  }
}
