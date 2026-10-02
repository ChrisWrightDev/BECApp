<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 class="text-4xl font-bold mb-4">Important Reminders</h1>
        <p class="text-base-content/70">One-off tasks for the hatchery — not the daily checklist</p>
      </div>
      <button type="button" class="btn btn-primary w-full sm:w-auto" @click="openCreateModal">
        <Icon name="mdi:plus" class="w-4 h-4" />
        Add reminder
      </button>
    </div>

    <PageLoadState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && openReminders.length === 0 && completedReminders.length === 0"
      empty-icon="mdi:bell-alert-outline"
      empty-title="No reminders yet"
      empty-description="Add a one-off task, or turn an Ops Chat message into a reminder"
      @retry="retry"
    >
      <template #empty-action>
        <button type="button" class="btn btn-primary mt-4" @click="openCreateModal">
          Add reminder
        </button>
      </template>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-bold">Open</h2>
            <div class="badge badge-lg">{{ openReminders.length }}</div>
          </div>

          <div v-if="openReminders.length === 0" class="text-sm text-base-content/60 py-2">
            Nothing open right now
          </div>

          <TransitionGroup
            name="checklist-item"
            tag="div"
            class="checklist-item-list flex flex-col gap-3 relative"
            @after-leave="onActiveAfterLeave"
          >
            <div
              v-for="item in openReminders"
              :key="item.id"
              :data-item-id="item.id"
              class="checklist-item-row"
            >
              <ReminderItem :item="item" @toggle="handleToggle(item)" />
            </div>
          </TransitionGroup>

          <div
            v-if="visibleCompletedReminders.length > 0"
            class="collapse collapse-arrow bg-base-200 rounded-lg mt-3"
          >
            <input v-model="showCompleted" type="checkbox" />
            <div class="collapse-title text-base font-medium min-h-0 py-3">
              Completed ({{ visibleCompletedReminders.length }})
            </div>
            <div class="collapse-content px-0 relative z-10">
              <div class="flex flex-col gap-3 pt-1" @click.stop>
                <ReminderItem
                  v-for="item in visibleCompletedReminders"
                  :key="item.id"
                  :item="item"
                  @toggle="handleToggle(item)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLoadState>

    <dialog ref="createModal" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Add reminder</h3>
        <form class="space-y-4" @submit.prevent="handleCreate">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Title *</span>
            </label>
            <input
              v-model="form.title"
              type="text"
              required
              maxlength="4000"
              placeholder="What needs to happen?"
              class="input input-bordered w-full reminder-field"
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Details</span>
            </label>
            <textarea
              v-model="form.details"
              rows="3"
              placeholder="Optional notes"
              class="textarea textarea-bordered w-full reminder-field"
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Due date</span>
            </label>
            <input
              v-model="form.due_date"
              type="date"
              class="input input-bordered w-full reminder-field"
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Assignee</span>
            </label>
            <select v-model="form.assigned_to" class="select select-bordered w-full reminder-field">
              <option value="">All staff</option>
              <option v-for="person in staff" :key="person.id" :value="person.id">
                {{ staffName(person.id) }}
              </option>
            </select>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="closeCreateModal">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving || !form.title.trim()">
              <span v-if="saving" class="loading loading-spinner loading-sm"></span>
              Save
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit" @click="closeCreateModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

useHead({
  title: 'Important Reminders'
})

const {
  staff,
  openReminders,
  completedReminders,
  staffName,
  fetchReminders,
  fetchStaff,
  createReminder,
  toggleReminder,
  subscribeToRealtime,
  unsubscribeFromRealtime
} = useReminders()

const { loading, error, load, retry } = usePageLoad(async () => {
  const { error: fetchError } = await fetchReminders()
  if (fetchError) throw fetchError
  await fetchStaff()
})

const { showError, showSuccess } = useNotifications()

const createModal = ref(null)
const saving = ref(false)
const showCompleted = ref(false)
const pendingDoneIds = ref(new Set())
const LEAVE_MS = 350
let realtimeChannel = null

const form = ref({
  title: '',
  details: '',
  due_date: '',
  assigned_to: ''
})

const visibleCompletedReminders = computed(() => {
  const pending = pendingDoneIds.value
  return completedReminders.value.filter((item) => !pending.has(item.id))
})

const resetForm = () => {
  form.value = {
    title: '',
    details: '',
    due_date: '',
    assigned_to: ''
  }
}

const openCreateModal = () => {
  resetForm()
  createModal.value?.showModal()
}

const closeCreateModal = () => {
  createModal.value?.close()
}

const handleCreate = async () => {
  if (saving.value || !form.value.title.trim()) return
  saving.value = true
  const { error: createError } = await createReminder({
    title: form.value.title,
    details: form.value.details,
    due_date: form.value.due_date || null,
    assigned_to: form.value.assigned_to || null
  })
  saving.value = false
  if (createError) {
    showError(createError.message || 'Failed to add reminder')
    return
  }
  closeCreateModal()
  resetForm()
  showSuccess('Reminder added')
}

const releasePending = (itemId) => {
  if (!itemId || !pendingDoneIds.value.has(itemId)) return
  const next = new Set(pendingDoneIds.value)
  next.delete(itemId)
  pendingDoneIds.value = next
}

const onActiveAfterLeave = (el) => {
  releasePending(el?.dataset?.itemId)
}

const handleToggle = async (item) => {
  const completing = !item.completed_at
  if (completing) {
    const next = new Set(pendingDoneIds.value)
    next.add(item.id)
    pendingDoneIds.value = next
  } else {
    releasePending(item.id)
    showCompleted.value = true
  }

  const { error: toggleError } = await toggleReminder(item.id)
  if (toggleError) {
    releasePending(item.id)
    showError(
      typeof toggleError === 'string'
        ? toggleError
        : (toggleError.message || 'Failed to update reminder')
    )
    return
  }

  if (completing) {
    window.setTimeout(() => releasePending(item.id), LEAVE_MS + 50)
  }
}

onMounted(async () => {
  await load()
  if (!error.value) {
    realtimeChannel = subscribeToRealtime()
  }
})

onUnmounted(() => {
  if (realtimeChannel) unsubscribeFromRealtime(realtimeChannel)
})
</script>

<style>
.checklist-item-list {
  min-height: 0;
}

.checklist-item-move {
  transition: transform 350ms ease;
}

.checklist-item-enter-active,
.checklist-item-leave-active {
  transition: opacity 350ms ease, transform 350ms ease;
}

.checklist-item-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 1;
}

.checklist-item-enter-from,
.checklist-item-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

@media (prefers-reduced-motion: reduce) {
  .checklist-item-move {
    transition: none;
  }

  .checklist-item-enter-active,
  .checklist-item-leave-active {
    transition: opacity 350ms ease;
  }

  .checklist-item-enter-from,
  .checklist-item-leave-to {
    opacity: 0;
    transform: none;
  }
}
</style>

<style scoped>
.reminder-field,
.reminder-field:focus,
.reminder-field:disabled {
  font-size: 16px !important;
}
</style>
