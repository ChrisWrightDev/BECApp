import { withTimeout } from '~/utils/loadState'

const MISSING_TABLE_MESSAGE = 'Important reminders are not set up yet. Ask an admin to apply the database migration.'

export const isMissingRemindersTable = (err) => {
  const code = err?.code || err?.cause?.code
  const msg = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`.toLowerCase()
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist') ||
    (msg.includes('schema cache') && msg.includes('important_reminders'))
  )
}

const remindersError = (err) => {
  if (isMissingRemindersTable(err)) {
    const wrapped = new Error(MISSING_TABLE_MESSAGE)
    wrapped.code = err?.code
    wrapped.cause = err
    return wrapped
  }
  return err
}

const chicagoToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

export const attentionBadgeText = (count) => {
  const n = Number(count) || 0
  if (n <= 0) return ''
  return n > 9 ? '9+' : String(n)
}

// Null assigned_to is "All staff" — same label as staffName().
export const isAttentionReminder = (item, userId) => {
  if (!item || item.completed_at) return false
  if (item.assigned_to == null) return true
  return Boolean(userId) && item.assigned_to === userId
}

// One realtime channel shared by the dock, homepage, reminders page, and chat.
const reminderSync = {
  holders: 0,
  channel: null,
  client: null,
  reminders: null,
  refresh: null,
  detach: null,
  localWrites: 0,
  fetchSeq: 0
}

const applyReminderPayload = (payload) => {
  const target = reminderSync.reminders
  if (!target || !payload) return

  if (payload.eventType === 'INSERT') {
    if (!target.value.some((row) => row.id === payload.new.id)) {
      target.value = [...target.value, payload.new]
    }
  } else if (payload.eventType === 'UPDATE') {
    const index = target.value.findIndex((row) => row.id === payload.new.id)
    if (index !== -1) {
      target.value[index] = payload.new
    } else {
      target.value = [...target.value, payload.new]
    }
  } else if (payload.eventType === 'DELETE') {
    target.value = target.value.filter((row) => row.id !== payload.old.id)
  }
}

export const useReminders = () => {
  const supabase = useSupabaseClient()
  const { user } = useAuth()

  const reminders = useState('importantReminders', () => [])
  const staff = useState('reminderStaff', () => [])
  const remindersStatus = useState('importantRemindersStatus', () => 'idle')
  const remindersLoadError = useState('importantRemindersError', () => null)

  const openReminders = computed(() => {
    return [...reminders.value]
      .filter((item) => !item.completed_at)
      .sort((a, b) => {
        if (a.due_date && b.due_date && a.due_date !== b.due_date) {
          return a.due_date < b.due_date ? -1 : 1
        }
        if (a.due_date && !b.due_date) return -1
        if (!a.due_date && b.due_date) return 1
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
  })

  const completedReminders = computed(() => {
    return [...reminders.value]
      .filter((item) => item.completed_at)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
  })

  const attentionReminders = computed(() => {
    const userId = user.value?.id
    return openReminders.value.filter((item) => isAttentionReminder(item, userId))
  })

  const attentionCount = computed(() => attentionReminders.value.length)

  const attentionBadgeLabel = computed(() => {
    if (remindersStatus.value !== 'ready') return ''
    return attentionBadgeText(attentionCount.value)
  })

  const reminderMessageIds = computed(() => {
    const ids = new Set()
    reminders.value.forEach((item) => {
      if (item.source_message_id) ids.add(item.source_message_id)
    })
    return ids
  })

  const isOverdue = (item) => {
    if (!item?.due_date || item.completed_at) return false
    return item.due_date < chicagoToday()
  }

  const isDueToday = (item) => {
    if (!item?.due_date || item.completed_at) return false
    return item.due_date === chicagoToday()
  }

  const staffName = (profileId) => {
    if (!profileId) return 'All staff'
    const row = staff.value.find((person) => person.id === profileId)
    if (!row) return 'Staff'
    const name = [row.firstname, row.lastname].filter(Boolean).join(' ').trim()
    return name || 'Staff'
  }

  const fetchReminders = async ({ background = false } = {}) => {
    if (background && (reminderSync.localWrites > 0 || remindersStatus.value === 'loading')) {
      return { data: reminders.value, error: null }
    }

    const seq = ++reminderSync.fetchSeq
    const showLoading = !background && remindersStatus.value !== 'ready'
    if (showLoading) {
      remindersStatus.value = 'loading'
      remindersLoadError.value = null
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('important_reminders')
          .select('*')
          .order('created_at', { ascending: true })
      )

      if (seq !== reminderSync.fetchSeq) return { data: reminders.value, error: null }
      if (error) throw error
      reminders.value = data || []
      remindersStatus.value = 'ready'
      remindersLoadError.value = null
      return { data: reminders.value, error: null }
    } catch (err) {
      if (seq !== reminderSync.fetchSeq) return { data: null, error: err }
      const next = remindersError(err)
      if (background && remindersStatus.value === 'ready') {
        console.warn('Reminder refresh unavailable:', next?.message || next)
        return { data: reminders.value, error: next }
      }
      remindersStatus.value = 'error'
      remindersLoadError.value = next
      console.error('Error fetching reminders:', next)
      return { data: null, error: next }
    }
  }

  const fetchStaff = async () => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('id, firstname, lastname')
          .order('firstname', { ascending: true })
      )
      if (error) throw error
      staff.value = data || []
      return { data: staff.value, error: null }
    } catch (err) {
      console.warn('Reminder staff list unavailable:', err?.message || err)
      return { data: [], error: err }
    }
  }

  const createReminder = async ({ title, details = null, due_date = null, assigned_to = null, source_message_id = null }) => {
    const trimmedTitle = (title || '').trim()
    if (!trimmedTitle) return { data: null, error: new Error('Title is required') }

    reminderSync.localWrites += 1
    try {
      const payload = {
        title: trimmedTitle,
        details: details?.trim() ? details.trim() : null,
        due_date: due_date || null,
        assigned_to: assigned_to || null,
        source_message_id: source_message_id || null
      }
      if (user.value?.id) payload.created_by = user.value.id

      const { data, error } = await supabase
        .from('important_reminders')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      reminders.value = [...reminders.value, data]
      return { data, error: null }
    } catch (err) {
      const next = remindersError(err)
      console.error('Error creating reminder:', next)
      return { data: null, error: next }
    } finally {
      reminderSync.localWrites = Math.max(0, reminderSync.localWrites - 1)
    }
  }

  const toggleReminder = async (reminderId) => {
    const item = reminders.value.find((row) => row.id === reminderId)
    if (!item) return { error: 'Reminder not found' }

    const original = {
      completed_at: item.completed_at,
      completed_by: item.completed_by
    }
    const completing = !item.completed_at
    item.completed_at = completing ? new Date().toISOString() : null
    item.completed_by = completing ? user.value?.id || null : null

    reminderSync.localWrites += 1
    try {
      const { data, error } = await supabase
        .from('important_reminders')
        .update({
          completed_at: item.completed_at,
          completed_by: item.completed_by
        })
        .eq('id', reminderId)
        .select()
        .single()

      if (error) throw error
      Object.assign(item, data)
      return { data, error: null }
    } catch (err) {
      item.completed_at = original.completed_at
      item.completed_by = original.completed_by
      const next = remindersError(err)
      console.error('Error toggling reminder:', next)
      return { data: null, error: next }
    } finally {
      reminderSync.localWrites = Math.max(0, reminderSync.localWrites - 1)
    }
  }

  const subscribeToRealtime = () => {
    reminderSync.reminders = reminders
    reminderSync.client = supabase
    reminderSync.refresh = () => fetchReminders({ background: true })

    if (!import.meta.client) return reminderSync.channel

    reminderSync.holders += 1
    if (reminderSync.channel) return reminderSync.channel

    reminderSync.channel = supabase
      .channel('important_reminders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'important_reminders' },
        applyReminderPayload
      )
      .subscribe()

    let refreshTimer = null
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        reminderSync.refresh?.()
      }, 200)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') scheduleRefresh()
    }
    window.addEventListener('focus', scheduleRefresh)
    document.addEventListener('visibilitychange', onVisibility)
    reminderSync.detach = () => {
      clearTimeout(refreshTimer)
      window.removeEventListener('focus', scheduleRefresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }

    return reminderSync.channel
  }

  const unsubscribeFromRealtime = () => {
    if (!import.meta.client) return
    reminderSync.holders = Math.max(0, reminderSync.holders - 1)
    if (reminderSync.holders > 0) return

    if (reminderSync.channel && reminderSync.client) {
      reminderSync.client.removeChannel(reminderSync.channel)
    }
    reminderSync.channel = null
    reminderSync.detach?.()
    reminderSync.detach = null
  }

  return {
    reminders,
    staff,
    remindersStatus,
    remindersError: remindersLoadError,
    openReminders,
    completedReminders,
    attentionReminders,
    attentionCount,
    attentionBadgeLabel,
    reminderMessageIds,
    isOverdue,
    isDueToday,
    staffName,
    fetchReminders,
    fetchStaff,
    createReminder,
    toggleReminder,
    subscribeToRealtime,
    unsubscribeFromRealtime
  }
}
