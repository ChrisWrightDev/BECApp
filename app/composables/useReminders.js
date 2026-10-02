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

export const useReminders = () => {
  const supabase = useSupabaseClient()
  const { user } = useAuth()

  const reminders = useState('importantReminders', () => [])
  const staff = useState('reminderStaff', () => [])

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

  const staffName = (profileId) => {
    if (!profileId) return 'All staff'
    const row = staff.value.find((person) => person.id === profileId)
    if (!row) return 'Staff'
    const name = [row.firstname, row.lastname].filter(Boolean).join(' ').trim()
    return name || 'Staff'
  }

  const fetchReminders = async () => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('important_reminders')
          .select('*')
          .order('created_at', { ascending: true })
      )

      if (error) throw error
      reminders.value = data || []
      return { data: reminders.value, error: null }
    } catch (err) {
      const next = remindersError(err)
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
    }
  }

  const subscribeToRealtime = () => {
    return supabase
      .channel('important_reminders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'important_reminders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (!reminders.value.some((row) => row.id === payload.new.id)) {
              reminders.value = [...reminders.value, payload.new]
            }
          } else if (payload.eventType === 'UPDATE') {
            const index = reminders.value.findIndex((row) => row.id === payload.new.id)
            if (index !== -1) {
              reminders.value[index] = payload.new
            } else {
              reminders.value = [...reminders.value, payload.new]
            }
          } else if (payload.eventType === 'DELETE') {
            reminders.value = reminders.value.filter((row) => row.id !== payload.old.id)
          }
        }
      )
      .subscribe()
  }

  const unsubscribeFromRealtime = (channel) => {
    if (channel) supabase.removeChannel(channel)
  }

  return {
    reminders,
    staff,
    openReminders,
    completedReminders,
    reminderMessageIds,
    isOverdue,
    staffName,
    fetchReminders,
    fetchStaff,
    createReminder,
    toggleReminder,
    subscribeToRealtime,
    unsubscribeFromRealtime
  }
}
