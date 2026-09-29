export const useUnreadCount = () => {
  const supabase = useSupabaseClient()
  const unreadCount = useState('chatUnreadCount', () => 0)

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('sender_role', ['agent', 'system'])
        .is('read_at', null)

      if (error) throw error
      unreadCount.value = count || 0
    } catch (err) {
      console.warn('Unread chat count unavailable:', err?.message || err)
    }
  }

  const clearUnreadCount = () => {
    unreadCount.value = 0
  }

  return {
    unreadCount: readonly(unreadCount),
    fetchUnreadCount,
    clearUnreadCount
  }
}
