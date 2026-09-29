<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 pt-2 pb-2 bg-base-100">
      <h1 class="text-xl font-semibold text-center">Messages</h1>
      <div v-if="!canSend" class="alert alert-info mt-2 text-xs">
        <Icon name="mdi:information-outline" class="w-4 h-4" />
        <span>View only - your account can't send messages</span>
      </div>
    </div>

    <!-- Messages container -->
    <div
      ref="messagesContainer"
      class="flex-1 min-h-0 overflow-y-auto px-4 py-2 bg-base-200"
      @scroll="handleScroll"
    >
      <div v-if="loading" class="flex justify-center py-12">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="displayMessages.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <Icon name="mdi:message-outline" class="w-16 h-16 text-base-content/30 mb-4" />
        <p class="text-lg text-base-content/70">No messages yet</p>
        <p class="text-sm text-base-content/50 mt-2">Start a conversation!</p>
      </div>

      <div v-else class="space-y-1">
        <template v-for="(message, index) in displayMessages" :key="message.id || message.tempId">
          <!-- Timestamp separator -->
          <div v-if="message.showTimestamp" class="flex justify-center my-3">
            <span class="text-xs text-base-content/50 px-2 py-1">
              {{ message.timestamp }}
            </span>
          </div>

          <!-- Message bubble -->
          <div class="flex" :class="isMyMessage(message) ? 'justify-end' : 'justify-start'">
            <div class="max-w-[75%] flex flex-col" :class="isMyMessage(message) ? 'items-end' : 'items-start'">
              <!-- Sender name for incoming messages at start of group -->
              <div 
                v-if="!isMyMessage(message) && message.isGroupStart"
                class="text-xs text-base-content/50 px-3 mb-1"
              >
                {{ getSenderDisplayName(message.sender_role) }}
              </div>

              <!-- Message bubble -->
              <div
                class="px-4 py-2 break-words whitespace-pre-wrap text-[15px] leading-[20px]"
                :class="getMessageBubbleClass(message)"
                @click="message.sendFailed ? retryMessage(message) : null"
              >
                <span>{{ message.body }}</span>
                <span v-if="message.sendFailed" class="ml-2 text-xs opacity-75">Tap to retry</span>
              </div>

              <!-- Status for last outgoing message -->
              <div 
                v-if="isMyMessage(message) && index === displayMessages.length - 1"
                class="text-[11px] text-base-content/50 px-3 mt-1"
              >
                {{ getMessageStatus(message) }}
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Message input (only if user can send) -->
    <div 
      v-if="canSend" 
      class="flex-shrink-0 bg-base-100 px-4 py-2 pb-2"
    >
      <div class="flex items-end gap-2">
        <textarea
          ref="messageInput"
          v-model="newMessageBody"
          placeholder="iMessage"
          class="flex-1 px-4 py-2 rounded-full bg-base-200 border-0 focus:outline-none focus:ring-0 resize-none overflow-hidden text-base leading-[20px]"
          :disabled="sending || !canSend"
          :maxlength="4000"
          @input="adjustTextareaHeight"
          rows="1"
          enterkeyhint="enter"
        ></textarea>
        <button
          @click="handleSendMessage"
          class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          :class="canSendCurrentMessage ? 'bg-[#0B84FE] hover:bg-[#0066cc]' : 'bg-base-300 opacity-50 cursor-not-allowed'"
          :disabled="!canSendCurrentMessage"
        >
          <Icon name="mdi:arrow-up" class="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getSenderRole, getSenderDisplayName, canSendMessages } from '~/utils/chatConfig'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { user } = useAuth()
const { 
  messages, 
  optimisticMessages, 
  loading, 
  sending,
  fetchMessages,
  fetchNewMessages,
  addMessage,
  updateMessage,
  addOptimisticMessage,
  replaceOptimistic,
  markOptimisticFailed,
  removeOptimistic,
  sendMessage, 
  markMessagesAsRead 
} = useMessages()
const { clearUnreadCount } = useUnreadCount()
const supabase = useSupabaseClient()
const { showError } = useNotifications()

const messagesContainer = ref(null)
const messageInput = ref(null)
const newMessageBody = ref('')
const realtimeChannel = ref(null)
const authSubscription = ref(null)
const viewportHandlers = ref(null)
const isNearBottom = ref(true)
let nextTempId = 1

// Computed
const userEmail = computed(() => user.value?.email?.toLowerCase() || '')
const senderRole = computed(() => getSenderRole(userEmail.value))
const canSend = computed(() => canSendMessages(userEmail.value))

// Merge real messages with optimistic ones
const allMessages = computed(() => {
  const realMsgs = messages.value || []
  const optMsgs = optimisticMessages.value || []
  
  const combined = [...realMsgs, ...optMsgs]
  
  // Sort by created_at
  return combined.sort((a, b) => {
    const aTime = new Date(a.created_at).getTime()
    const bTime = new Date(b.created_at).getTime()
    return aTime - bTime
  })
})

// Add grouping and timestamp separators
const displayMessages = computed(() => {
  const result = []
  let lastSender = null
  let lastTime = null
  
  allMessages.value.forEach((message, index) => {
    const currentTime = new Date(message.created_at)
    const isGroupStart = message.sender_id !== lastSender
    
    // Check if this is the last message in a group
    const nextMessage = allMessages.value[index + 1]
    const isGroupEnd = !nextMessage || nextMessage.sender_id !== message.sender_id
    
    // Add timestamp separator if gap > 15 minutes or different day
    let showTimestamp = false
    let timestamp = ''
    if (index === 0 || !lastTime) {
      showTimestamp = true
      timestamp = formatTimestampSeparator(currentTime)
    } else {
      const timeDiff = (currentTime.getTime() - lastTime.getTime()) / 1000 / 60 // minutes
      if (timeDiff > 15 || currentTime.toDateString() !== lastTime.toDateString()) {
        showTimestamp = true
        timestamp = formatTimestampSeparator(currentTime)
      }
    }
    
    result.push({
      ...message,
      isGroupStart,
      isGroupEnd,
      showTimestamp,
      timestamp
    })
    
    lastSender = message.sender_id
    lastTime = currentTime
  })
  
  return result
})

const canSendCurrentMessage = computed(() => {
  return canSend.value && 
         !sending.value && 
         newMessageBody.value.trim().length > 0 && 
         newMessageBody.value.length <= 4000
})

// Methods
const isMyMessage = (message) => {
  return message.sender_id === user.value?.id
}

const getMessageBubbleClass = (message) => {
  const baseClasses = []
  
  if (isMyMessage(message)) {
    // User's messages: blue bubble with white text (iMessage style) - same in light and dark mode
    baseClasses.push('bg-[#0B84FE] text-white')
    
    // Determine rounding based on group position
    if (message.isGroupStart && message.isGroupEnd) {
      // Single message in group
      baseClasses.push('rounded-[18px]')
    } else if (message.isGroupStart) {
      // First in group - full rounding
      baseClasses.push('rounded-[18px]')
    } else if (message.isGroupEnd) {
      // Last in group - small tail corner on bottom-right
      baseClasses.push('rounded-[18px] rounded-br-[4px]')
    } else {
      // Middle of group - reduced corners on right side
      baseClasses.push('rounded-l-[18px] rounded-tr-[18px] rounded-br-[6px]')
    }
  } else {
    // Other users' messages: light gray in light mode, darker gray in dark mode
    baseClasses.push('bg-[#E9E9EB] text-black dark:bg-[#3A3A3C] dark:text-white')
    
    if (message.isGroupStart && message.isGroupEnd) {
      // Single message in group
      baseClasses.push('rounded-[18px]')
    } else if (message.isGroupStart) {
      // First in group - full rounding
      baseClasses.push('rounded-[18px]')
    } else if (message.isGroupEnd) {
      // Last in group - small tail corner on bottom-left
      baseClasses.push('rounded-[18px] rounded-bl-[4px]')
    } else {
      // Middle of group - reduced corners on left side
      baseClasses.push('rounded-r-[18px] rounded-tl-[18px] rounded-bl-[6px]')
    }
  }
  
  // Failed state
  if (message.sendFailed) {
    baseClasses.push('opacity-60 cursor-pointer')
  }
  
  return baseClasses.join(' ')
}

const formatTimestampSeparator = (date) => {
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  
  if (isToday) {
    return `Today ${formatter.format(date)}`
  } else if (isYesterday) {
    return `Yesterday ${formatter.format(date)}`
  } else {
    const fullFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return fullFormatter.format(date)
  }
}

const getMessageStatus = (message) => {
  if (message.sendFailed) return 'Not delivered'
  if (message.tempId && !message.id) return 'Sending…'
  
  // Check agent_status for detailed status
  if (message.agent_status === 'processing') return 'Agent is reading…'
  if (message.agent_status === 'replied') return 'Replied'
  if (message.agent_status === 'error') return 'Agent error'
  if (message.agent_status === 'pending') return 'Delivered'
  
  return 'Delivered'
}

const handleScroll = () => {
  if (!messagesContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  // Consider "near bottom" if within 100px
  isNearBottom.value = scrollHeight - scrollTop - clientHeight < 100
}

const scrollToBottom = (smooth = true, force = false) => {
  nextTick(() => {
    if (messagesContainer.value && (force || isNearBottom.value)) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  })
}

const adjustTextareaHeight = () => {
  const textarea = messageInput.value
  if (!textarea) return
  
  textarea.style.height = 'auto'
  const newHeight = Math.min(textarea.scrollHeight, 120) // Max ~6 lines
  textarea.style.height = `${newHeight}px`
}

const handleSendMessage = async () => {
  if (!canSendCurrentMessage.value || sending.value) return

  const body = newMessageBody.value.trim()
  if (!body) return

  const tempId = `temp-${nextTempId++}-${Date.now()}`
  const optimisticMessage = {
    tempId,
    thread: 'ops',
    sender_role: senderRole.value,
    sender_id: user.value.id,
    body,
    created_at: new Date().toISOString(),
    sendFailed: false
  }

  // Optimistic update using composable helper
  addOptimisticMessage(optimisticMessage)
  newMessageBody.value = ''
  
  // Reset textarea height
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
  }
  
  scrollToBottom(true, true) // Force scroll
  
  // Focus back on input
  nextTick(() => messageInput.value?.focus())

  // Send to server
  const { data, error } = await sendMessage({
    thread: 'ops',
    sender_role: senderRole.value,
    sender_id: user.value.id,
    body
  })

  if (error || !data) {
    // Mark as failed
    markOptimisticFailed(tempId)
    showError('Failed to send message. Tap to retry.')
  } else {
    // Replace optimistic with real message
    replaceOptimistic(tempId, data)
    scrollToBottom()
  }
}

const retryMessage = async (message) => {
  if (!message.sendFailed || !message.tempId) return
  
  // Remove the failed message
  removeOptimistic(message.tempId)
  
  // Re-add as new message
  newMessageBody.value = message.body
  await handleSendMessage()
}

const handleRealtimeInsert = (newMessage) => {
  // Remove any matching optimistic message
  const matchingOpt = optimisticMessages.value.find(opt => 
    opt.sender_id === newMessage.sender_id &&
    opt.body === newMessage.body &&
    Math.abs(new Date(opt.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 5000
  )
  
  if (matchingOpt) {
    removeOptimistic(matchingOpt.tempId)
  }

  // Add using composable helper (dedupes by id)
  addMessage(newMessage)
  
  // Auto-scroll only if near bottom or if it's from current user
  const isFromMe = newMessage.sender_id === user.value?.id
  scrollToBottom(true, isFromMe)
  
  // Mark as read if from agent/system and page is visible
  if (['agent', 'system'].includes(newMessage.sender_role) && 
      !newMessage.read_at && 
      document.visibilityState === 'visible') {
    markMessagesAsRead([newMessage.id])
  }
}

const handleRealtimeUpdate = (updatedMessage) => {
  // Use composable helper to update
  updateMessage(updatedMessage)
}

const setupRealtimeSubscription = () => {
  if (realtimeChannel.value) {
    supabase.removeChannel(realtimeChannel.value)
  }
  
  realtimeChannel.value = supabase
    .channel('messages-ops')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'thread=eq.ops'
      },
      (payload) => handleRealtimeInsert(payload.new)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: 'thread=eq.ops'
      },
      (payload) => handleRealtimeUpdate(payload.new)
    )
    .subscribe()
}

const handleVisibilityChange = async () => {
  if (document.visibilityState === 'visible') {
    // Fetch any new messages we might have missed
    const latestMessage = messages.value[messages.value.length - 1]
    if (latestMessage) {
      const { data: newMsgs } = await fetchNewMessages('ops', latestMessage.created_at)
      newMsgs.forEach(msg => addMessage(msg))
    }
    
    // Mark unread messages as read
    const unreadAgentMessages = messages.value
      .filter(m => ['agent', 'system'].includes(m.sender_role) && !m.read_at)
      .map(m => m.id)
    
    if (unreadAgentMessages.length > 0) {
      markMessagesAsRead(unreadAgentMessages)
      clearUnreadCount()
    }
  }
}

// Lifecycle
onMounted(async () => {
  // Load messages
  await fetchMessages('ops', 200)
  scrollToBottom(false, true) // Instant scroll on initial load
  
  // Mark unread agent/system messages as read
  const unreadAgentMessages = messages.value
    .filter(m => ['agent', 'system'].includes(m.sender_role) && !m.read_at)
    .map(m => m.id)
  
  if (unreadAgentMessages.length > 0) {
    markMessagesAsRead(unreadAgentMessages)
    clearUnreadCount()
  }
  
  // Subscribe to realtime
  setupRealtimeSubscription()
  
  // Listen for visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // Listen for auth state changes
  authSubscription.value = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      // Only resubscribe on sign in, not token refresh
      setupRealtimeSubscription()
    }
  })
  
  // Handle iOS keyboard with visualViewport API
  if (window.visualViewport) {
    const handleViewportResize = () => {
      // Scroll to keep messages visible when keyboard opens/closes
      requestAnimationFrame(() => {
        if (isNearBottom.value) {
          scrollToBottom(false, true)
        }
      })
    }
    window.visualViewport.addEventListener('resize', handleViewportResize)
    window.visualViewport.addEventListener('scroll', handleViewportResize)
    viewportHandlers.value = { handleViewportResize }
  }
})

onUnmounted(() => {
  if (realtimeChannel.value) {
    supabase.removeChannel(realtimeChannel.value)
  }
  
  if (authSubscription.value && authSubscription.value.subscription) {
    authSubscription.value.subscription.unsubscribe()
  }
  
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  
  // Clean up visualViewport handlers
  if (window.visualViewport && viewportHandlers.value) {
    window.visualViewport.removeEventListener('resize', viewportHandlers.value.handleViewportResize)
    window.visualViewport.removeEventListener('scroll', viewportHandlers.value.handleViewportResize)
  }
})
</script>
