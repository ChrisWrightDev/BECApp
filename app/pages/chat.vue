<template>
  <div class="flex flex-col h-[calc(100vh-12rem)] sm:h-[calc(100vh-14rem)]">
    <div class="mb-4 sm:mb-6">
      <h1 class="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2">Messages</h1>
      <p class="text-sm sm:text-base text-base-content/70">Chat with the ops agent</p>
      <div v-if="!canSend" class="alert alert-info mt-4 text-sm sm:text-base">
        <Icon name="mdi:information-outline" class="w-5 h-5" />
        <span>Your account isn't set up to send messages. You can view messages only.</span>
      </div>
    </div>

    <!-- Messages container -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto bg-base-100 rounded-lg shadow-lg p-3 sm:p-4 mb-3 sm:mb-4 space-y-3 sm:space-y-4"
    >
      <div v-if="loading" class="flex justify-center py-12">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="displayMessages.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <Icon name="mdi:message-outline" class="w-16 h-16 text-base-content/30 mb-4" />
        <p class="text-lg text-base-content/70">No messages yet</p>
        <p class="text-sm text-base-content/50 mt-2">Start a conversation!</p>
      </div>

      <div v-else>
        <div
          v-for="message in displayMessages"
          :key="message.id"
          class="flex"
          :class="isMyMessage(message) ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] sm:max-w-[75%] rounded-lg p-3 sm:p-4"
            :class="getMessageBubbleClass(message)"
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="font-semibold text-sm">
                {{ getSenderDisplayName(message.sender_role) }}
              </span>
              <span class="text-xs opacity-70">
                {{ formatMessageTime(message.created_at) }}
              </span>
            </div>
            <div class="text-sm sm:text-base whitespace-pre-wrap break-words">
              {{ message.body }}
            </div>
            <div
              v-if="isMyMessage(message) && message.agent_status"
              class="mt-2 text-xs opacity-70 flex items-center gap-1"
            >
              <Icon
                :name="getStatusIcon(message.agent_status)"
                class="w-3 h-3 sm:w-4 sm:h-4"
              />
              <span>{{ getStatusLabel(message.agent_status) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Message input (only if user can send) -->
    <div v-if="canSend" class="bg-base-100 rounded-lg shadow-lg p-3 sm:p-4">
      <div class="flex flex-col gap-2">
        <div class="flex items-end gap-2">
          <textarea
            ref="messageInput"
            v-model="newMessageBody"
            placeholder="Type your message..."
            class="textarea textarea-bordered flex-1 min-h-[60px] sm:min-h-[80px] max-h-[200px] resize-none text-sm sm:text-base"
            :disabled="sending || !canSend"
            :maxlength="4000"
            @keydown="handleKeyDown"
          ></textarea>
          <button
            @click="handleSendMessage"
            class="btn btn-primary btn-sm sm:btn-md flex-shrink-0"
            :disabled="!canSendCurrentMessage"
          >
            <Icon name="mdi:send" class="w-4 h-4 sm:w-5 sm:h-5" />
            <span class="hidden sm:inline">Send</span>
          </button>
        </div>
        <div class="flex justify-between items-center text-xs sm:text-sm text-base-content/60">
          <span v-if="sending" class="flex items-center gap-1">
            <span class="loading loading-spinner loading-xs"></span>
            Sending...
          </span>
          <span v-else></span>
          <span :class="{ 'text-warning': characterCount > 3800, 'text-error': characterCount > 3950 }">
            {{ characterCount }} / 4000
          </span>
        </div>
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
const { messages, loading, sending, fetchMessages, sendMessage, markMessagesAsRead, subscribeToMessages, unsubscribeFromMessages } = useMessages()
const { showSuccess, showError } = useNotifications()

const messagesContainer = ref(null)
const messageInput = ref(null)
const newMessageBody = ref('')
const realtimeChannel = ref(null)

// Computed
const userEmail = computed(() => user.value?.email?.toLowerCase() || '')
const senderRole = computed(() => getSenderRole(userEmail.value))
const canSend = computed(() => canSendMessages(userEmail.value))

const displayMessages = computed(() => messages.value || [])

const characterCount = computed(() => newMessageBody.value.length)

const canSendCurrentMessage = computed(() => {
  return canSend.value && 
         !sending.value && 
         newMessageBody.value.trim().length > 0 && 
         characterCount.value <= 4000
})

// Methods
const isMyMessage = (message) => {
  return message.sender_id === user.value?.id
}

const getMessageBubbleClass = (message) => {
  if (isMyMessage(message)) {
    return 'bg-primary text-primary-content'
  }
  
  const roleClasses = {
    agent: 'bg-secondary text-secondary-content',
    system: 'bg-info text-info-content',
    mike: 'bg-accent text-accent-content',
    chris: 'bg-accent text-accent-content'
  }
  return roleClasses[message.sender_role] || 'bg-base-200'
}

const formatMessageTime = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  
  return formatter.format(date)
}

const getStatusIcon = (status) => {
  const icons = {
    pending: 'mdi:clock-outline',
    processing: 'mdi:sync',
    replied: 'mdi:check-circle',
    error: 'mdi:alert-circle',
    none: 'mdi:check'
  }
  return icons[status] || 'mdi:circle'
}

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Pending',
    processing: 'Processing',
    replied: 'Replied',
    error: 'Error',
    none: 'Sent'
  }
  return labels[status] || status
}

const scrollToBottom = (smooth = true) => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  })
}

const handleSendMessage = async () => {
  if (!canSendCurrentMessage.value) return

  const body = newMessageBody.value.trim()
  if (!body) return

  const messageData = {
    thread: 'ops',
    sender_role: senderRole.value,
    sender_id: user.value.id,
    body
  }

  const { data, error } = await sendMessage(messageData)
  
  if (!error && data) {
    newMessageBody.value = ''
    scrollToBottom()
    // Focus back on input for quick follow-up
    nextTick(() => messageInput.value?.focus())
  }
}

const handleKeyDown = (event) => {
  // Enter to send (desktop), Shift+Enter for newline
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSendMessage()
  }
}

const handleRealtimeInsert = (newMessage) => {
  // De-duplicate by id
  const exists = messages.value.some(m => m.id === newMessage.id)
  if (!exists) {
    messages.value.push(newMessage)
    scrollToBottom()
    
    // Mark as read if it's from agent/system and page is visible
    if (['agent', 'system'].includes(newMessage.sender_role) && 
        !newMessage.read_at && 
        document.visibilityState === 'visible') {
      markMessagesAsRead([newMessage.id])
    }
  }
}

const handleRealtimeUpdate = (updatedMessage) => {
  const index = messages.value.findIndex(m => m.id === updatedMessage.id)
  if (index !== -1) {
    messages.value[index] = updatedMessage
  }
}

const markUnreadMessagesAsRead = () => {
  if (document.visibilityState !== 'visible') return
  
  const unreadAgentMessages = messages.value
    .filter(m => ['agent', 'system'].includes(m.sender_role) && !m.read_at)
    .map(m => m.id)
  
  if (unreadAgentMessages.length > 0) {
    markMessagesAsRead(unreadAgentMessages)
  }
}

// Lifecycle
onMounted(async () => {
  // Load messages
  await fetchMessages('ops', 200)
  scrollToBottom(false) // Instant scroll on initial load
  
  // Mark unread agent/system messages as read
  markUnreadMessagesAsRead()
  
  // Subscribe to realtime
  realtimeChannel.value = subscribeToMessages('ops', handleRealtimeInsert, handleRealtimeUpdate)
  
  // Listen for visibility changes to mark messages as read
  document.addEventListener('visibilitychange', markUnreadMessagesAsRead)
})

onUnmounted(() => {
  // Unsubscribe from realtime
  if (realtimeChannel.value) {
    unsubscribeFromMessages(realtimeChannel.value)
  }
  
  document.removeEventListener('visibilitychange', markUnreadMessagesAsRead)
})
</script>
