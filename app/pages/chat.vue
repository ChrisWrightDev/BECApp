<template>
  <div class="min-h-screen bg-base-100 max-w-[600px] mx-auto">
    <!-- Header -->
    <div class="sticky top-0 z-10 bg-base-100 border-b border-base-300">
      <div class="flex items-center justify-between p-4">
        <div class="flex items-center space-x-3 min-w-0">
          <NuxtLink to="/" class="btn btn-ghost btn-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back
          </NuxtLink>
          <div class="flex items-center space-x-3 min-w-0">
            <div class="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
            </div>
            <div class="min-w-0">
              <h1 class="text-lg font-semibold truncate">Ops Chat</h1>
              <p class="text-sm text-base-content/70 truncate">Hatchery operations</p>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!canSend" class="px-4 pb-3">
        <div class="alert alert-info text-xs py-2">
          <Icon name="mdi:information-outline" class="w-4 h-4" />
          <span>View only — your account can't send messages</span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error State -->
    <div v-else-if="loadError" class="flex items-center justify-center h-64">
      <div class="text-center">
        <div class="text-error text-lg font-semibold mb-2">Failed to load messages</div>
        <div class="text-base-content/70 mb-4">{{ loadError }}</div>
        <button class="btn btn-primary" @click="loadMessages">Try Again</button>
      </div>
    </div>

    <!-- Messages Container -->
    <div v-else class="flex flex-col h-[calc(100vh-140px)]">
      <!-- Messages List -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
        <div v-if="allMessages.length === 0" class="flex items-center justify-center h-full">
          <div class="text-center text-base-content/70">
            <svg class="w-16 h-16 mx-auto mb-4 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <div class="text-lg font-semibold mb-2">No messages yet</div>
            <div>Start the conversation by sending a message!</div>
          </div>
        </div>

        <!-- Message Groups -->
        <div v-for="(group, groupIndex) in messageGroups" :key="groupIndex" class="space-y-1">
          <!-- Date Separator -->
          <div v-if="group.date" class="flex items-center justify-center my-4">
            <div class="bg-base-200 text-base-content/70 px-3 py-1 rounded-full text-sm">
              {{ formatDate(group.date) }}
            </div>
          </div>

          <!-- Messages in Group -->
          <div
            v-for="(message, messageIndex) in group.messages"
            :key="message.id || message.tempId"
            :data-message-id="message.id || message.tempId"
            class="flex message-item"
            :class="isOwnMessage(message) ? 'justify-end' : 'justify-start'"
          >
            <div class="flex max-w-[70%]" :class="isOwnMessage(message) ? 'flex-row-reverse' : 'flex-row'">
              <!-- Avatar -->
              <div
                v-if="!isOwnMessage(message) && (messageIndex === 0 || senderKey(group.messages[messageIndex - 1]) !== senderKey(message))"
                class="flex-shrink-0 mr-2"
              >
                <div class="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm">
                  {{ getUserInitials(message) }}
                </div>
              </div>
              <div v-else-if="!isOwnMessage(message)" class="w-8 mr-2"></div>

              <!-- Message Bubble -->
              <div class="flex flex-col" :class="isOwnMessage(message) ? 'items-end' : 'items-start'">
                <!-- Sender Name (only for first message in group) -->
                <div
                  v-if="!isOwnMessage(message) && (messageIndex === 0 || senderKey(group.messages[messageIndex - 1]) !== senderKey(message))"
                  class="text-xs text-base-content/70 mb-1 ml-1"
                >
                  {{ getMessageName(message) }}
                </div>

                <!-- Message Content -->
                <div
                  class="px-4 py-2 rounded-2xl max-w-full break-words"
                  :class="[
                    isOwnMessage(message)
                      ? 'bg-primary text-primary-content rounded-br-md'
                      : 'bg-base-200 text-base-content rounded-bl-md',
                    message.sendFailed ? 'opacity-60 cursor-pointer' : ''
                  ]"
                  @click="message.sendFailed ? retryMessage(message) : null"
                >
                  <div class="whitespace-pre-wrap">{{ message.body }}</div>
                  <div v-if="message.sendFailed" class="text-xs mt-1 opacity-80">Tap to retry</div>
                </div>

                <!-- Timestamp -->
                <div class="text-xs text-base-content/50 mt-1" :class="isOwnMessage(message) ? 'mr-1' : 'ml-1'">
                  {{ formatTime(message.created_at) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <div v-if="canSend" class="border-t border-base-300 p-4 bg-base-100">
        <form class="flex space-x-2" @submit.prevent="handleSendMessage">
          <div class="flex-1">
            <textarea
              ref="messageInput"
              v-model="newMessage"
              placeholder="Type a message..."
              class="chat-composer-input input input-bordered w-full min-h-[3rem] py-2 resize-none overflow-hidden leading-5"
              style="font-size: 16px"
              rows="1"
              maxlength="4000"
              enterkeyhint="enter"
              :disabled="sending"
              @input="adjustTextareaHeight"
            ></textarea>
          </div>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="!canSendCurrentMessage"
          >
            <span v-if="sending" class="loading loading-spinner loading-sm"></span>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getSenderRole, getSenderDisplayName, canSendMessages } from '~/utils/chatConfig'

definePageMeta({
  middleware: 'auth',
  layout: 'blank'
})

useHead({
  title: 'Ops Chat'
})

const { user, profile } = useAuth()
const {
  messages,
  optimisticMessages,
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
const newMessage = ref('')
const isLoading = ref(true)
const loadError = ref('')
const profilesById = ref({})
const realtimeChannel = ref(null)
const authSubscription = ref(null)
const isNearBottom = ref(true)
let nextTempId = 1

const userEmail = computed(() => user.value?.email?.toLowerCase() || '')
const senderRole = computed(() => getSenderRole(userEmail.value))
const canSend = computed(() => canSendMessages(userEmail.value))

const allMessages = computed(() => {
  const combined = [...(messages.value || []), ...(optimisticMessages.value || [])]
  return combined.sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
})

const messageGroups = computed(() => {
  if (!allMessages.value.length) return []

  const groups = []
  let currentGroup = null

  allMessages.value.forEach((message, index) => {
    const messageDate = new Date(message.created_at).toDateString()
    const prevMessage = index > 0 ? allMessages.value[index - 1] : null
    const prevDate = prevMessage ? new Date(prevMessage.created_at).toDateString() : null

    if (!currentGroup ||
        messageDate !== prevDate ||
        senderKey(message) !== senderKey(prevMessage)) {
      currentGroup = {
        date: messageDate !== prevDate ? messageDate : null,
        messages: []
      }
      groups.push(currentGroup)
    }

    currentGroup.messages.push(message)
  })

  return groups
})

const canSendCurrentMessage = computed(() => {
  return canSend.value &&
    !sending.value &&
    newMessage.value.trim().length > 0 &&
    newMessage.value.length <= 4000
})

const senderKey = (message) => {
  if (!message) return ''
  return message.sender_id || message.sender_role || ''
}

const isOwnMessage = (message) => {
  return Boolean(user.value?.id && message.sender_id === user.value.id)
}

const getMessageName = (message) => {
  if (message.sender_id && message.sender_id === user.value?.id && profile.value?.firstname) {
    return [profile.value.firstname, profile.value.lastname].filter(Boolean).join(' ')
  }
  const row = message.sender_id ? profilesById.value[message.sender_id] : null
  if (row?.firstname) {
    return [row.firstname, row.lastname].filter(Boolean).join(' ')
  }
  return getSenderDisplayName(message.sender_role)
}

const getUserInitials = (message) => {
  const name = getMessageName(message) || 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago'
  })
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago'
  })
}

const loadProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, firstname, lastname')

    if (error) throw error
    const map = {}
    ;(data || []).forEach((row) => {
      map[row.id] = row
    })
    profilesById.value = map
  } catch (err) {
    console.warn('Chat profiles unavailable:', err?.message || err)
  }
}

const markUnreadAgentMessages = () => {
  const unreadAgentMessages = (messages.value || [])
    .filter((m) => ['agent', 'system'].includes(m.sender_role) && !m.read_at)
    .map((m) => m.id)

  if (unreadAgentMessages.length > 0) {
    markMessagesAsRead(unreadAgentMessages)
    clearUnreadCount()
  } else {
    clearUnreadCount()
  }
}

const loadMessages = async () => {
  isLoading.value = true
  loadError.value = ''
  const { error } = await fetchMessages('ops', 200)
  isLoading.value = false
  if (error) {
    loadError.value = error.message || 'Failed to load messages'
    return
  }
  await nextTick()
  messagesContainer.value?.removeEventListener('scroll', onMessagesScroll)
  messagesContainer.value?.addEventListener('scroll', onMessagesScroll)
  scrollToBottom(false)
  markUnreadAgentMessages()
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
  textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
}

const handleSendMessage = async () => {
  if (!canSendCurrentMessage.value || sending.value) return

  const body = newMessage.value.trim()
  if (!body) return

  const tempId = `temp-${nextTempId++}-${Date.now()}`
  addOptimisticMessage({
    tempId,
    thread: 'ops',
    sender_role: senderRole.value,
    sender_id: user.value.id,
    body,
    created_at: new Date().toISOString(),
    sendFailed: false
  })
  newMessage.value = ''
  if (messageInput.value) messageInput.value.style.height = 'auto'
  isNearBottom.value = true
  scrollToBottom(true, true)
  nextTick(() => messageInput.value?.focus())

  const { data, error } = await sendMessage({
    thread: 'ops',
    sender_role: senderRole.value,
    sender_id: user.value.id,
    body
  })

  if (error || !data) {
    markOptimisticFailed(tempId)
    showError('Failed to send message. Tap to retry.')
  } else {
    replaceOptimistic(tempId, data)
    scrollToBottom()
  }
}

const retryMessage = async (message) => {
  if (!message.sendFailed || !message.tempId) return
  removeOptimistic(message.tempId)
  newMessage.value = message.body
  await handleSendMessage()
}

const handleRealtimeInsert = (newMsg) => {
  const matchingOpt = optimisticMessages.value.find((opt) =>
    opt.sender_id === newMsg.sender_id &&
    opt.body === newMsg.body &&
    Math.abs(new Date(opt.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 5000
  )
  if (matchingOpt) removeOptimistic(matchingOpt.tempId)

  addMessage(newMsg)
  const isFromMe = newMsg.sender_id === user.value?.id
  scrollToBottom(true, isFromMe)

  if (['agent', 'system'].includes(newMsg.sender_role) &&
      !newMsg.read_at &&
      document.visibilityState === 'visible') {
    markMessagesAsRead([newMsg.id])
    clearUnreadCount()
  }
}

const setupRealtimeSubscription = () => {
  if (realtimeChannel.value) {
    supabase.removeChannel(realtimeChannel.value)
  }

  realtimeChannel.value = supabase
    .channel('messages-ops')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: 'thread=eq.ops' },
      (payload) => handleRealtimeInsert(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: 'thread=eq.ops' },
      (payload) => updateMessage(payload.new)
    )
    .subscribe()
}

const handleVisibilityChange = async () => {
  if (document.visibilityState !== 'visible') return
  const latestMessage = messages.value[messages.value.length - 1]
  if (latestMessage) {
    const { data: newMsgs } = await fetchNewMessages('ops', latestMessage.created_at)
    newMsgs.forEach((msg) => addMessage(msg))
  }
  markUnreadAgentMessages()
}

const onMessagesScroll = () => {
  if (!messagesContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  isNearBottom.value = scrollHeight - scrollTop - clientHeight < 100
}

onMounted(async () => {
  await loadProfiles()
  await loadMessages()
  setupRealtimeSubscription()
  document.addEventListener('visibilitychange', handleVisibilityChange)

  authSubscription.value = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') setupRealtimeSubscription()
  })
})

onUnmounted(() => {
  if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value)
  if (authSubscription.value?.subscription) {
    authSubscription.value.subscription.unsubscribe()
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  messagesContainer.value?.removeEventListener('scroll', onMessagesScroll)
})
</script>

<style scoped>
textarea.chat-composer-input,
textarea.chat-composer-input:focus,
textarea.chat-composer-input:disabled {
  font-size: 16px !important;
}
</style>
