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
    <div v-else class="flex flex-col h-[calc(100vh-140px)] min-h-0">
      <!-- Messages List -->
      <div ref="messagesContainer" class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 overscroll-contain">
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
            <div
              class="flex max-w-[92%]"
              :class="[
                isOwnMessage(message) ? 'flex-row-reverse' : 'flex-row',
                imageAttachments(message).length ? 'w-full' : ''
              ]"
            >
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
              <div
                class="flex min-w-0 max-w-full flex-col"
                :class="[
                  isOwnMessage(message) ? 'items-end' : 'items-start',
                  imageAttachments(message).length ? 'flex-1' : ''
                ]"
              >
                <!-- Sender Name (only for first message in group) -->
                <div
                  v-if="!isOwnMessage(message) && (messageIndex === 0 || senderKey(group.messages[messageIndex - 1]) !== senderKey(message))"
                  class="text-xs text-base-content/70 mb-1 ml-1"
                >
                  {{ getMessageName(message) }}
                </div>

                <!-- Message Content -->
                <div
                  class="px-4 py-2 rounded-2xl max-w-full break-words select-none"
                  :class="[
                    imageAttachments(message).length ? 'w-full' : '',
                    isOwnMessage(message)
                      ? 'bg-primary text-primary-content rounded-br-md'
                      : 'bg-base-200 text-base-content rounded-bl-md',
                    message.sendFailed ? 'opacity-60 cursor-pointer' : ''
                  ]"
                  @click="onBubbleClick(message)"
                  @contextmenu.prevent="openReminderSheet(message)"
                  @touchstart.passive="startReminderPress(message)"
                  @touchend="cancelReminderPress"
                  @touchmove="cancelReminderPress"
                  @mousedown="startReminderPress(message)"
                  @mouseup="cancelReminderPress"
                  @mouseleave="cancelReminderPress"
                >
                  <button
                    v-if="message.reply_to"
                    type="button"
                    class="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs"
                    :class="isOwnMessage(message) ? 'bg-black/15' : 'bg-base-300'"
                    @click.stop="scrollToMessage(message.reply_to)"
                  >
                    <img
                      v-if="replyThumb(replyParent(message))"
                      :src="replyThumb(replyParent(message))"
                      alt=""
                      class="h-8 w-8 shrink-0 rounded object-cover"
                    >
                    <span class="min-w-0 truncate">{{ replyPreviewLabel(replyParent(message)) }}</span>
                  </button>

                  <div
                    v-if="imageAttachments(message).length"
                    class="-mx-2 flex flex-col gap-1"
                    :class="message.body ? 'mb-1' : ''"
                  >
                    <button
                      v-for="(attachment, attachmentIndex) in imageAttachments(message)"
                      :key="attachment.path || attachment.previewUrl || attachmentIndex"
                      type="button"
                      class="relative block w-full overflow-hidden rounded-xl bg-black/10"
                      :style="attachmentAspectStyle(attachment)"
                      @click.stop="onPhotoClick(message, attachmentIndex)"
                    >
                      <img
                        v-if="attachmentSrc(attachment)"
                        :src="attachmentSrc(attachment)"
                        alt="Photo"
                        class="block h-full w-full object-cover"
                        :width="attachment.width || undefined"
                        :height="attachment.height || undefined"
                        @error="onPhotoError(attachment)"
                      >
                      <span
                        v-else
                        class="absolute inset-0 flex items-center justify-center px-2 text-center text-xs"
                      >
                        {{ photoFailed(attachment.path) ? 'Photo unavailable' : 'Loading photo…' }}
                      </span>
                      <span
                        v-if="message.uploading && attachmentIndex === 0"
                        class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 px-2 text-xs text-white"
                      >
                        <span>Sending {{ message.uploadProgress || 0 }}%</span>
                        <progress
                          class="progress progress-primary h-1 w-full"
                          :value="message.uploadProgress || 0"
                          max="100"
                        />
                      </span>
                    </button>
                  </div>

                  <div v-if="message.body" class="whitespace-pre-wrap">{{ message.body }}</div>
                  <div v-if="message.sendFailed" class="text-xs mt-1 opacity-80">Couldn't send. Tap to retry.</div>
                </div>

                <!-- Timestamp -->
                <div class="text-xs text-base-content/50 mt-1 flex items-center gap-1" :class="isOwnMessage(message) ? 'mr-1 flex-row-reverse' : 'ml-1'">
                  <span>{{ formatTime(message.created_at) }}</span>
                  <span
                    v-if="hasReminder(message)"
                    class="inline-flex items-center text-warning"
                    title="Saved as an important reminder"
                  >
                    <Icon name="mdi:bell-alert-outline" class="w-3.5 h-3.5" />
                  </span>
                  <details
                    v-if="canCreateReminderFrom(message)"
                    class="dropdown dropdown-top"
                    :class="isOwnMessage(message) ? 'dropdown-end' : ''"
                    @click.stop
                  >
                    <summary class="btn btn-ghost btn-xs btn-circle min-h-0 h-5 w-5" aria-label="Message actions">
                      <Icon name="mdi:dots-horizontal" class="w-4 h-4" />
                    </summary>
                    <ul class="dropdown-content menu bg-base-100 text-base-content rounded-box z-20 w-56 p-2 shadow">
                      <li>
                        <button type="button" @click="startReply(message)">Reply</button>
                      </li>
                      <li>
                        <button type="button" @click="openReminderSheet(message)">
                          Add to Important Reminders
                        </button>
                      </li>
                    </ul>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <div v-if="canSend" class="shrink-0 border-t border-base-300 p-4 bg-base-100">
        <div
          v-if="replyingTo"
          class="mb-2 flex items-center gap-2 rounded-lg bg-base-200 px-2 py-1 text-sm"
        >
          <img
            v-if="replyThumb(replyingTo)"
            :src="replyThumb(replyingTo)"
            alt=""
            class="h-8 w-8 shrink-0 rounded object-cover"
          >
          <span class="min-w-0 flex-1 truncate">{{ replyPreviewLabel(replyingTo) }}</span>
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle"
            aria-label="Cancel reply"
            @click="replyingTo = null"
          >
            <Icon name="mdi:close" class="w-4 h-4" />
          </button>
        </div>

        <div v-if="pendingPhotos.length" class="mb-2 flex h-16 gap-2 overflow-x-auto">
          <div
            v-for="photo in pendingPhotos"
            :key="photo.id"
            class="relative h-16 w-16 shrink-0"
          >
            <img
              :src="photo.previewUrl"
              alt=""
              class="h-16 w-16 rounded-lg object-cover"
            >
            <button
              type="button"
              class="btn btn-circle btn-xs absolute right-0.5 top-0.5 min-h-0 h-5 w-5 border-0 bg-base-100"
              aria-label="Remove photo"
              :disabled="outgoing"
              @click="removePendingPhoto(photo.id)"
            >
              <Icon name="mdi:close" class="w-3 h-3" />
            </button>
          </div>
        </div>

        <form class="flex items-end gap-2" @submit.prevent>
          <button
            type="button"
            class="btn btn-ghost btn-square shrink-0"
            aria-label="Add photos"
            :disabled="preparingPhotos || outgoing || pendingPhotos.length >= MAX_CHAT_PHOTOS"
            @click="openPhotoPicker"
          >
            <span v-if="preparingPhotos" class="loading loading-spinner loading-sm"></span>
            <Icon v-else name="mdi:camera-outline" class="w-6 h-6" />
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="onPhotosSelected"
          >
          <div class="min-w-0 flex-1">
            <textarea
              ref="messageInput"
              v-model="newMessage"
              placeholder="Type a message..."
              class="chat-composer-input input input-bordered w-full min-h-[3rem] py-2 resize-none overflow-hidden leading-5"
              style="font-size: 16px"
              rows="1"
              maxlength="4000"
              enterkeyhint="enter"
              :disabled="sending || outgoing"
              @input="adjustTextareaHeight"
            ></textarea>
          </div>
          <button
            type="button"
            class="btn btn-primary shrink-0"
            :disabled="!canSendCurrentMessage"
            @click="handleSendMessage"
          >
            <span v-if="sending || outgoing" class="loading loading-spinner loading-sm"></span>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
        </form>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="viewer"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black"
        @click.self="closeViewer"
        @touchstart.passive="onViewerTouchStart"
        @touchend="onViewerTouchEnd"
      >
        <button
          type="button"
          class="btn btn-circle btn-ghost absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-10 text-white"
          aria-label="Close photo"
          @click="closeViewer"
        >
          <Icon name="mdi:close" class="w-6 h-6" />
        </button>
        <button
          v-if="viewer.attachments.length > 1"
          type="button"
          class="btn btn-circle btn-ghost absolute left-2 top-1/2 z-10 -translate-y-1/2 text-white"
          aria-label="Previous photo"
          @click="stepViewer(-1)"
        >
          <Icon name="mdi:chevron-left" class="w-8 h-8" />
        </button>
        <img
          v-if="viewerSrc"
          :src="viewerSrc"
          alt="Photo"
          class="chat-photo-viewer-img max-h-full max-w-full object-contain"
        >
        <div v-else class="px-6 text-center text-sm text-white/80">
          {{ viewerLoading ? 'Loading photo…' : 'Photo unavailable' }}
        </div>
        <button
          v-if="viewer.attachments.length > 1"
          type="button"
          class="btn btn-circle btn-ghost absolute right-2 top-1/2 z-10 -translate-y-1/2 text-white"
          aria-label="Next photo"
          @click="stepViewer(1)"
        >
          <Icon name="mdi:chevron-right" class="w-8 h-8" />
        </button>
      </div>
    </Teleport>

    <dialog ref="reminderSheet" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-1">Add to Important Reminders</h3>
        <p class="text-sm text-base-content/70 mb-4">Saves a one-off task linked to this chat message</p>
        <form class="space-y-4" @submit.prevent="saveReminderFromChat">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Title *</span>
            </label>
            <textarea
              v-model="reminderForm.title"
              required
              rows="3"
              maxlength="4000"
              class="textarea textarea-bordered w-full reminder-field"
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Due date</span>
            </label>
            <input
              v-model="reminderForm.due_date"
              type="date"
              class="input input-bordered w-full reminder-field"
            />
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="closeReminderSheet">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="savingReminder || !reminderForm.title.trim()">
              <span v-if="savingReminder" class="loading loading-spinner loading-sm"></span>
              Save reminder
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit" @click="closeReminderSheet">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { getSenderRole, getSenderDisplayName, canSendMessages } from '~/utils/chatConfig'
import {
  MAX_CHAT_PHOTOS,
  imageAttachments,
  messagePreviewText,
  replyPreviewLabel,
  attachmentAspectStyle,
  compressChatImage,
  buildChatPhotoPath,
  toStoredImageAttachment,
  isProbablyImageFile
} from '~/utils/chatPhotos'

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
  patchOptimistic,
  removeOptimistic,
  sendMessage,
  markMessagesAsRead
} = useMessages()
const {
  photoUrl,
  photoFailed,
  forgetPhotoUrl,
  ensurePhotoUrl,
  primePhotoUrls,
  uploadChatPhoto,
  markPhotoFailed
} = useChatPhotos()
const { clearUnreadCount } = useUnreadCount()
const supabase = useSupabaseClient()
const { showError, showSuccess } = useNotifications()
const {
  reminderMessageIds,
  fetchReminders,
  createReminder,
  subscribeToRealtime,
  unsubscribeFromRealtime
} = useReminders()
const route = useRoute()

const messagesContainer = ref(null)
const messageInput = ref(null)
const reminderSheet = ref(null)
const reminderSource = ref(null)
const reminderForm = ref({ title: '', due_date: '' })
const savingReminder = ref(false)
let reminderPressTimer = null
let remindersChannel = null
const newMessage = ref('')
const pendingPhotos = ref([])
const preparingPhotos = ref(false)
const outgoing = ref(false)
const replyingTo = ref(null)
const fileInput = ref(null)
const viewer = ref(null)
const viewerLoading = ref(false)
const deliveries = new Map()
const retriedPhotoPaths = new Set()
let longPressFired = false
let viewerTouchStartX = 0
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

const messagesById = computed(() => {
  const map = {}
  for (const message of allMessages.value) {
    if (message.id) map[message.id] = message
  }
  return map
})

const canSendCurrentMessage = computed(() => {
  const withinLimit = newMessage.value.length <= 4000
  const hasText = newMessage.value.trim().length > 0
  const hasPhotos = pendingPhotos.value.length > 0
  return canSend.value &&
    !sending.value &&
    !outgoing.value &&
    !preparingPhotos.value &&
    withinLimit &&
    (hasText || hasPhotos)
})

const viewerSrc = computed(() => {
  const current = viewer.value
  if (!current) return ''
  const attachment = current.attachments[current.index]
  return attachmentSrc(attachment)
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

const canCreateReminderFrom = (message) => {
  return Boolean(message?.id && !message.tempId && !message.sendFailed)
}

const hasReminder = (message) => {
  return Boolean(message?.id && reminderMessageIds.value.has(message.id))
}

const openReminderSheet = (message) => {
  if (!canCreateReminderFrom(message)) return
  cancelReminderPress()
  if (import.meta.client) {
    document.querySelectorAll('details.dropdown[open]').forEach((el) => {
      el.removeAttribute('open')
    })
  }
  reminderSource.value = message
  reminderForm.value = {
    title: messagePreviewText(message),
    due_date: ''
  }
  reminderSheet.value?.showModal()
}

const closeReminderSheet = () => {
  reminderSheet.value?.close()
}

const startReminderPress = (message) => {
  if (!canCreateReminderFrom(message)) return
  cancelReminderPress()
  longPressFired = false
  reminderPressTimer = window.setTimeout(() => {
    longPressFired = true
    openReminderSheet(message)
  }, 500)
}

const cancelReminderPress = () => {
  if (reminderPressTimer) {
    window.clearTimeout(reminderPressTimer)
    reminderPressTimer = null
  }
}

const saveReminderFromChat = async () => {
  if (savingReminder.value || !reminderForm.value.title.trim() || !reminderSource.value?.id) return
  savingReminder.value = true
  const { error } = await createReminder({
    title: reminderForm.value.title,
    due_date: reminderForm.value.due_date || null,
    source_message_id: reminderSource.value.id
  })
  savingReminder.value = false
  if (error) {
    showError(error.message || 'Failed to save reminder')
    return
  }
  closeReminderSheet()
  showSuccess('Added to Important Reminders')
}

const scrollToMessage = (messageId) => {
  if (!messageId || !messagesContainer.value) return
  const el = messagesContainer.value.querySelector(`[data-message-id="${messageId}"]`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
  await primePhotoUrls(messages.value)
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

const closeOpenMenus = () => {
  if (!import.meta.client) return
  document.querySelectorAll('details.dropdown[open]').forEach((el) => {
    el.removeAttribute('open')
  })
}

const replyParent = (message) => {
  if (!message?.reply_to) return null
  return messagesById.value[message.reply_to] || null
}

const replyThumb = (message) => {
  const attachment = imageAttachments(message)[0]
  if (!attachment) return ''
  return attachment.previewUrl || photoUrl(attachment.path)
}

const attachmentSrc = (attachment) => {
  if (!attachment) return ''
  if (attachment.previewUrl) return attachment.previewUrl
  return photoUrl(attachment.path)
}

const optimisticAttachments = (photos, stored = []) => {
  return photos.map((photo, index) => {
    const uploaded = stored[index]
    if (uploaded) {
      return { ...uploaded, previewUrl: photo.previewUrl }
    }
    return {
      type: 'image',
      previewUrl: photo.previewUrl,
      width: photo.width,
      height: photo.height,
      size: photo.size,
      mime: 'image/jpeg'
    }
  })
}

const releaseDelivery = (tempId) => {
  const payload = deliveries.get(tempId)
  if (!payload) return
  payload.photos.forEach((photo) => {
    if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl)
  })
  deliveries.delete(tempId)
}

const openPhotoPicker = () => {
  if (preparingPhotos.value || outgoing.value) return
  if (pendingPhotos.value.length >= MAX_CHAT_PHOTOS) return
  fileInput.value?.click()
}

const removePendingPhoto = (id) => {
  const photo = pendingPhotos.value.find((item) => item.id === id)
  if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl)
  pendingPhotos.value = pendingPhotos.value.filter((item) => item.id !== id)
}

const onPhotosSelected = async (event) => {
  const input = event.target
  const selected = Array.from(input.files || [])
  input.value = ''
  if (!selected.length) return

  const room = MAX_CHAT_PHOTOS - pendingPhotos.value.length
  if (room <= 0) {
    showError('You can attach up to 4 photos.')
    return
  }
  if (selected.length > room) {
    showError('You can attach up to 4 photos.')
  }

  preparingPhotos.value = true
  try {
    for (const file of selected.slice(0, room)) {
      if (!isProbablyImageFile(file)) {
        showError('Choose a photo.')
        continue
      }
      try {
        const compressed = await compressChatImage(file)
        pendingPhotos.value = [
          ...pendingPhotos.value,
          {
            id: crypto.randomUUID(),
            previewUrl: URL.createObjectURL(compressed.blob),
            blob: compressed.blob,
            width: compressed.width,
            height: compressed.height,
            size: compressed.size
          }
        ]
      } catch (error) {
        showError(error?.message || 'Couldn\'t open that photo.')
      }
    }
  } finally {
    preparingPhotos.value = false
    if (isNearBottom.value) scrollToBottom(false, true)
  }
}

const startReply = (message) => {
  if (!message?.id || message.tempId || message.sendFailed) return
  cancelReminderPress()
  closeOpenMenus()
  replyingTo.value = message
  const attachment = imageAttachments(message)[0]
  if (attachment?.path && !attachment.previewUrl && !photoUrl(attachment.path)) {
    ensurePhotoUrl(attachment.path)
  }
  nextTick(() => messageInput.value?.focus())
}

const onBubbleClick = (message) => {
  if (longPressFired) return
  if (message.sendFailed) retryMessage(message)
}

const onPhotoClick = (message, index) => {
  if (longPressFired) return
  openViewer(message, index)
}

const onPhotoError = (attachment) => {
  if (!attachment?.path || attachment.previewUrl) return
  if (retriedPhotoPaths.has(attachment.path)) {
    forgetPhotoUrl(attachment.path)
    markPhotoFailed(attachment.path)
    return
  }
  retriedPhotoPaths.add(attachment.path)
  forgetPhotoUrl(attachment.path)
  ensurePhotoUrl(attachment.path)
}

const openViewer = async (message, index) => {
  const attachments = imageAttachments(message)
  if (!attachments.length) return
  viewer.value = { attachments, index }
  const attachment = attachments[index]
  if (attachment?.path && !attachment.previewUrl && !photoUrl(attachment.path)) {
    viewerLoading.value = true
    await ensurePhotoUrl(attachment.path)
    viewerLoading.value = false
  }
}

const closeViewer = () => {
  viewer.value = null
  viewerLoading.value = false
}

const stepViewer = async (delta) => {
  const current = viewer.value
  if (!current || current.attachments.length < 2) return
  const count = current.attachments.length
  const index = (current.index + delta + count) % count
  viewer.value = { ...current, index }
  const attachment = current.attachments[index]
  if (attachment?.path && !attachment.previewUrl && !photoUrl(attachment.path)) {
    viewerLoading.value = true
    await ensurePhotoUrl(attachment.path)
    viewerLoading.value = false
  }
}

const onViewerTouchStart = (event) => {
  viewerTouchStartX = event.changedTouches?.[0]?.clientX || 0
}

const onViewerTouchEnd = (event) => {
  const endX = event.changedTouches?.[0]?.clientX || 0
  const delta = endX - viewerTouchStartX
  if (Math.abs(delta) < 40) return
  stepViewer(delta > 0 ? -1 : 1)
}

const onViewerKeydown = (event) => {
  if (!viewer.value) return
  if (event.key === 'Escape') closeViewer()
  if (event.key === 'ArrowRight') stepViewer(1)
  if (event.key === 'ArrowLeft') stepViewer(-1)
}

const uploadPayloadPhotos = async (tempId, payload) => {
  const stored = payload.uploaded.slice()
  const total = payload.photos.length || 1
  for (let index = stored.length; index < payload.photos.length; index += 1) {
    const photo = payload.photos[index]
    const path = buildChatPhotoPath('ops')
    await uploadChatPhoto({
      path,
      blob: photo.blob,
      onProgress: (percent) => {
        const overall = Math.round(((index + (percent / 100)) / total) * 100)
        patchOptimistic(tempId, { uploadProgress: overall })
      }
    })
    stored.push(toStoredImageAttachment({
      path,
      width: photo.width,
      height: photo.height,
      size: photo.size
    }))
    payload.uploaded = stored.slice()
    patchOptimistic(tempId, {
      uploadProgress: Math.round(((index + 1) / total) * 100),
      attachments: optimisticAttachments(payload.photos, stored)
    })
  }
  return stored
}

const deliverMessage = async (tempId) => {
  const payload = deliveries.get(tempId)
  if (!payload || outgoing.value) return
  outgoing.value = true
  patchOptimistic(tempId, {
    sendFailed: false,
    uploading: payload.photos.length > 0,
    uploadProgress: payload.uploaded.length && payload.photos.length
      ? Math.round((payload.uploaded.length / payload.photos.length) * 100)
      : 0
  })

  try {
    const stored = await uploadPayloadPhotos(tempId, payload)
    patchOptimistic(tempId, { uploading: false, uploadProgress: 100 })

    const messageData = {
      thread: 'ops',
      sender_role: senderRole.value,
      sender_id: user.value.id,
      body: payload.body,
      attachments: stored
    }
    if (payload.replyTo) messageData.reply_to = payload.replyTo

    const { data, error } = await sendMessage(messageData, { silent: true })
    if (error || !data) {
      throw error || new Error('Failed to send message')
    }

    await primePhotoUrls([data])
    replaceOptimistic(tempId, data)
    releaseDelivery(tempId)
    scrollToBottom()
  } catch (error) {
    patchOptimistic(tempId, { uploading: false, sendFailed: true, uploadProgress: 0 })
    showError(error?.message || 'Failed to send message. Tap to retry.')
  } finally {
    outgoing.value = false
  }
}

const handleSendMessage = async () => {
  if (!canSendCurrentMessage.value || sending.value || outgoing.value) return

  const body = newMessage.value.trim()
  const photos = pendingPhotos.value.slice()
  if (!body && !photos.length) return

  const tempId = `temp-${nextTempId++}-${Date.now()}`
  const replyTo = replyingTo.value?.id || null
  deliveries.set(tempId, {
    body,
    photos,
    replyTo,
    uploaded: []
  })
  addOptimisticMessage({
    tempId,
    thread: 'ops',
    sender_role: senderRole.value,
    sender_id: user.value.id,
    body,
    attachments: optimisticAttachments(photos),
    reply_to: replyTo,
    created_at: new Date().toISOString(),
    sendFailed: false,
    uploading: photos.length > 0,
    uploadProgress: 0
  })

  pendingPhotos.value = []
  newMessage.value = ''
  replyingTo.value = null
  if (messageInput.value) messageInput.value.style.height = 'auto'
  isNearBottom.value = true
  scrollToBottom(true, true)
  nextTick(() => messageInput.value?.focus())
  await deliverMessage(tempId)
}

const retryMessage = async (message) => {
  if (!message?.sendFailed || !message.tempId || outgoing.value) return
  if (!deliveries.has(message.tempId)) {
    showError('Couldn\'t retry that message. Please send it again.')
    return
  }
  await deliverMessage(message.tempId)
}

const sameOutgoingMessage = (optimistic, incoming) => {
  if (!optimistic || optimistic.sender_id !== incoming.sender_id) return false
  const elapsed = Math.abs(new Date(optimistic.created_at).getTime() - new Date(incoming.created_at).getTime())
  if (elapsed >= 5000) return false
  const optimisticPath = imageAttachments(optimistic).find((item) => item.path)?.path
  const incomingPath = imageAttachments(incoming)[0]?.path
  if (optimisticPath || incomingPath) return Boolean(optimisticPath && optimisticPath === incomingPath)
  return optimistic.body === incoming.body
}

const handleRealtimeInsert = (newMsg) => {
  const matchingOpt = optimisticMessages.value.find((opt) => sameOutgoingMessage(opt, newMsg))
  if (matchingOpt) {
    releaseDelivery(matchingOpt.tempId)
    removeOptimistic(matchingOpt.tempId)
  }

  addMessage(newMsg)
  primePhotoUrls([newMsg])
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
    await primePhotoUrls(newMsgs)
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

  const { error: reminderError } = await fetchReminders()
  if (!reminderError) {
    remindersChannel = subscribeToRealtime()
  }

  if (route.query.message) {
    await nextTick()
    scrollToMessage(String(route.query.message))
  }

  document.addEventListener('keydown', onViewerKeydown)
})

onUnmounted(() => {
  if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value)
  if (remindersChannel) unsubscribeFromRealtime(remindersChannel)
  if (authSubscription.value?.subscription) {
    authSubscription.value.subscription.unsubscribe()
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  document.removeEventListener('keydown', onViewerKeydown)
  messagesContainer.value?.removeEventListener('scroll', onMessagesScroll)
  cancelReminderPress()
  pendingPhotos.value.forEach((photo) => {
    if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl)
  })
  for (const tempId of deliveries.keys()) releaseDelivery(tempId)
})
</script>

<style scoped>
textarea.chat-composer-input,
textarea.chat-composer-input:focus,
textarea.chat-composer-input:disabled,
.reminder-field,
.reminder-field:focus,
.reminder-field:disabled {
  font-size: 16px !important;
}

.chat-photo-viewer-img {
  touch-action: pinch-zoom;
}
</style>
