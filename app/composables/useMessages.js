export const useMessages = () => {
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  const { showError } = useNotifications()

  const messages = useState('messages', () => [])
  const optimisticMessages = useState('optimisticMessages', () => [])
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
   * Fetch messages newer than a given timestamp
   * @param {string} thread - Thread name
   * @param {string} afterTimestamp - ISO timestamp to fetch messages after
   */
  const fetchNewMessages = async (thread = 'ops', afterTimestamp) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread', thread)
        .gt('created_at', afterTimestamp)
        .order('created_at', { ascending: true })

      if (error) throw error

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Error fetching new messages:', error)
      return { data: [], error }
    }
  }

  /**
   * Add a message to the list (dedupe by id, keep sorted by created_at)
   * @param {Object} msg - Message object with id and created_at
   */
  const addMessage = (msg) => {
    if (!msg.id) return // Only add messages with real IDs
    
    // Check if it already exists
    const exists = messages.value.some(m => m.id === msg.id)
    if (exists) return
    
    // Add and sort by created_at
    messages.value = [...messages.value, msg].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }

  /**
   * Update an existing message
   * @param {Object} msg - Updated message object with id
   */
  const updateMessage = (msg) => {
    const index = messages.value.findIndex(m => m.id === msg.id)
    if (index !== -1) {
      messages.value = [
        ...messages.value.slice(0, index),
        msg,
        ...messages.value.slice(index + 1)
      ]
    }
  }

  /**
   * Add an optimistic message (before server confirms)
   * @param {Object} msg - Message object with tempId
   */
  const addOptimisticMessage = (msg) => {
    if (!msg.tempId) return
    optimisticMessages.value = [...optimisticMessages.value, msg]
  }

  /**
   * Replace optimistic message with real message
   * @param {string} tempId - Temporary ID of optimistic message
   * @param {Object} msg - Real message from server
   */
  const replaceOptimistic = (tempId, msg) => {
    // Remove optimistic
    optimisticMessages.value = optimisticMessages.value.filter(m => m.tempId !== tempId)
    // Add real message
    addMessage(msg)
  }

  /**
   * Mark an optimistic message as failed
   * @param {string} tempId - Temporary ID of optimistic message
   */
  const markOptimisticFailed = (tempId) => {
    const msg = optimisticMessages.value.find(m => m.tempId === tempId)
    if (msg) {
      msg.sendFailed = true
      // Trigger reactivity
      optimisticMessages.value = [...optimisticMessages.value]
    }
  }

  /**
   * Remove an optimistic message (for retry)
   * @param {string} tempId - Temporary ID of optimistic message
   */
  const removeOptimistic = (tempId) => {
    optimisticMessages.value = optimisticMessages.value.filter(m => m.tempId !== tempId)
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
    optimisticMessages: readonly(optimisticMessages),
    loading: readonly(loading),
    sending: readonly(sending),
    fetchMessages,
    fetchNewMessages,
    addMessage,
    updateMessage,
    addOptimisticMessage,
    replaceOptimistic,
    markOptimisticFailed,
    removeOptimistic,
    sendMessage,
    markMessagesAsRead,
    subscribeToMessages,
    unsubscribeFromMessages
  }
}
