export const useMessages = () => {
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  const { showError } = useNotifications()

  const messages = useState('messages', () => [])
  const loading = useState('messagesLoading', () => false)
  const sending = useState('messagesSending', () => false)

  /**
   * Fetch recent messages for a thread
   * @param {string} thread - Thread name (default: 'ops')
   * @param {number} limit - Number of messages to fetch (default: 200)
   */
  const fetchMessages = async (thread = 'ops', limit = 200) => {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread', thread)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      // Reverse to show oldest first (newest at bottom)
      messages.value = (data || []).reverse()
      return { data: messages.value, error: null }
    } catch (error) {
      console.error('Error fetching messages:', error)
      showError('Failed to load messages')
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  /**
   * Send a new message
   * @param {Object} messageData - Message data { thread, sender_role, sender_id, body, reply_to? }
   */
  const sendMessage = async (messageData) => {
    sending.value = true
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Error sending message:', error)
      showError('Failed to send message')
      return { data: null, error }
    } finally {
      sending.value = false
    }
  }

  /**
   * Mark messages as read
   * @param {Array<string>} messageIds - Array of message IDs to mark as read
   */
  const markMessagesAsRead = async (messageIds) => {
    if (!messageIds || messageIds.length === 0) return

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', messageIds)

      if (error) throw error
    } catch (error) {
      console.error('Error marking messages as read:', error)
      // Don't show error to user - this is a background operation
    }
  }

  /**
   * Subscribe to realtime changes for a thread
   * @param {string} thread - Thread name (default: 'ops')
   * @param {Function} onInsert - Callback for INSERT events
   * @param {Function} onUpdate - Callback for UPDATE events
   * @returns {Object} - Supabase realtime channel
   */
  const subscribeToMessages = (thread = 'ops', onInsert, onUpdate) => {
    const channel = supabase
      .channel(`messages-${thread}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread=eq.${thread}`
        },
        (payload) => {
          if (onInsert) onInsert(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `thread=eq.${thread}`
        },
        (payload) => {
          if (onUpdate) onUpdate(payload.new)
        }
      )
      .subscribe()

    return channel
  }

  /**
   * Unsubscribe from realtime channel
   * @param {Object} channel - Supabase realtime channel
   */
  const unsubscribeFromMessages = async (channel) => {
    if (channel) {
      await supabase.removeChannel(channel)
    }
  }

  return {
    messages: readonly(messages),
    loading: readonly(loading),
    sending: readonly(sending),
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    subscribeToMessages,
    unsubscribeFromMessages
  }
}
