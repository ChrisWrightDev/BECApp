<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-start justify-between gap-3 mb-6">
      <div class="min-w-0">
        <NuxtLink to="/admin/inquiries" class="btn btn-ghost btn-sm px-0 mb-2 -ml-1">
          <Icon name="mdi:chevron-left" class="w-5 h-5" />
          Inquiries
        </NuxtLink>
        <h1 class="text-3xl font-bold break-words">
          {{ inquiry ? inquiry.name : 'Inquiry' }}
        </h1>
        <p v-if="inquiry" class="text-sm text-base-content/70 mt-1">
          {{ formatOrderDateTime(inquiry.created_at) }}
        </p>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-circle shrink-0"
        aria-label="Refresh"
        :disabled="loading || savingNotes || savingStatus"
        @click="loadInquiry"
      >
        <Icon name="mdi:refresh" class="w-5 h-5" :class="{ 'animate-spin': loading && inquiry }" />
      </button>
    </div>

    <PageLoadState
      :loading="loading && !inquiry"
      :error="inquiry ? null : error"
      :empty="!loading && !error && !inquiry"
      empty-icon="mdi:inbox-outline"
      empty-title="Inquiry not found"
      empty-description="It may have been removed, or the link is wrong"
      @retry="retry"
    >
      <template #empty-action>
        <NuxtLink to="/admin/inquiries" class="btn btn-primary mt-4">Back to inquiries</NuxtLink>
      </template>

      <div v-if="inquiry" class="space-y-4">
        <div v-if="error" class="alert alert-error">
          <Icon name="mdi:alert-circle" class="w-5 h-5 shrink-0" />
          <span>{{ error }}</span>
          <button type="button" class="btn btn-sm" @click="retry">Retry</button>
        </div>

        <section class="card bg-base-100 shadow-xl">
          <div class="card-body p-4 gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge badge-sm" :class="inquiryTypeBadgeClass(inquiry.type)">
                {{ inquiryTypeLabel(inquiry.type) }}
              </span>
              <span class="badge badge-sm" :class="inquiryStatusBadgeClass(inquiry.status)">
                {{ inquiryStatusLabel(inquiry.status) }}
              </span>
            </div>
            <h2 class="font-semibold">Message</h2>
            <p v-if="inquiry.subject" class="font-medium break-words">{{ inquiry.subject }}</p>
            <p class="whitespace-pre-wrap break-words">{{ inquiry.message }}</p>
          </div>
        </section>

        <section class="card bg-base-100 shadow-xl">
          <div class="card-body p-4 gap-3">
            <h2 class="font-semibold">Contact</h2>
            <p class="font-medium break-words">{{ inquiry.name }}</p>
            <a
              v-if="emailHref"
              class="btn btn-outline w-full overflow-hidden"
              :href="emailHref"
            >
              <Icon name="mdi:email-outline" class="w-5 h-5 shrink-0" />
              <span class="truncate min-w-0">Email {{ inquiry.email }}</span>
            </a>
            <p v-else class="text-sm break-all">{{ inquiry.email }}</p>
            <a
              v-if="phoneHref"
              class="btn btn-outline w-full overflow-hidden"
              :href="phoneHref"
            >
              <Icon name="mdi:phone" class="w-5 h-5 shrink-0" />
              <span class="truncate min-w-0">Call {{ inquiry.phone }}</span>
            </a>
            <p v-else-if="inquiry.phone" class="text-sm break-all">{{ inquiry.phone }}</p>
            <p v-else class="text-sm text-base-content/60">No phone number</p>
          </div>
        </section>

        <section v-if="productHref || pairHref" class="card bg-base-100 shadow-xl">
          <div class="card-body p-4 gap-3">
            <h2 class="font-semibold">Related</h2>
            <a
              v-if="productHref"
              class="btn btn-outline w-full"
              :href="productHref"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="mdi:open-in-new" class="w-5 h-5" />
              <span class="truncate">Product · {{ inquiry.related_product_slug }}</span>
            </a>
            <a
              v-if="pairHref"
              class="btn btn-outline w-full"
              :href="pairHref"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="mdi:open-in-new" class="w-5 h-5" />
              <span class="truncate">Bonded pair · {{ inquiry.related_pair_slug }}</span>
            </a>
          </div>
        </section>

        <section class="card bg-base-100 shadow-xl">
          <div class="card-body p-4 gap-3">
            <h2 class="font-semibold">Status</h2>
            <p class="text-sm text-base-content/60">
              Only visible to admins. Changing status does not email the visitor.
            </p>
            <div class="grid grid-cols-3 gap-2" role="group" aria-label="Inquiry status">
              <button
                v-for="status in INQUIRY_STATUSES"
                :key="status"
                type="button"
                class="btn min-h-11 h-auto py-2"
                :class="inquiry.status === status ? 'btn-primary' : 'btn-outline'"
                :aria-pressed="inquiry.status === status"
                :disabled="savingStatus || loading"
                @click="setStatus(status)"
              >
                <span
                  v-if="savingStatus && pendingStatus === status"
                  class="loading loading-spinner loading-sm"
                />
                {{ inquiryStatusLabel(status) }}
              </button>
            </div>
            <p v-if="statusError" class="text-error text-sm" role="alert">{{ statusError }}</p>
            <p v-else-if="statusMessage" class="text-success text-sm" role="status">{{ statusMessage }}</p>
          </div>
        </section>

        <section class="card bg-base-100 shadow-xl">
          <div class="card-body p-4">
            <h2 class="font-semibold mb-1">Admin notes</h2>
            <p class="text-sm text-base-content/60 mb-4">
              Only visible to admins. Saving does not email the visitor.
            </p>
            <form class="space-y-4" @submit.prevent="saveNotes">
              <div class="form-control">
                <label class="label py-1" for="inquiry-notes">
                  <span class="label-text">Notes</span>
                </label>
                <textarea
                  id="inquiry-notes"
                  v-model="notes"
                  rows="4"
                  class="textarea textarea-bordered w-full ios-field"
                  placeholder="What you told them, follow-ups, anything staff should see"
                  :disabled="savingNotes"
                />
              </div>
              <p v-if="notesError" class="text-error text-sm" role="alert">{{ notesError }}</p>
              <p v-else-if="notesMessage" class="text-success text-sm" role="status">{{ notesMessage }}</p>
              <button type="submit" class="btn btn-primary w-full" :disabled="!canSaveNotes">
                <span v-if="savingNotes" class="loading loading-spinner loading-sm" />
                Save notes
              </button>
            </form>
          </div>
        </section>
      </div>
    </PageLoadState>
  </div>
</template>

<script setup>
import { formatOrderDateTime } from '~/utils/orders'
import {
  INQUIRY_STATUSES,
  inquiryStatusBadgeClass,
  inquiryStatusLabel,
  inquiryTypeBadgeClass,
  inquiryTypeLabel,
  isUuid,
  mailtoReply,
  pairUrl,
  productUrl,
  telHref
} from '~/utils/inbox'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const route = useRoute()
const { fetchInquiry, updateInquiry } = useInquiries()

const inquiry = ref(null)
const notes = ref('')
const savingNotes = ref(false)
const savingStatus = ref(false)
const pendingStatus = ref('')
const notesError = ref('')
const notesMessage = ref('')
const statusError = ref('')
const statusMessage = ref('')

const inquiryId = computed(() => String(route.params.id || ''))

const syncNotes = (row) => {
  notes.value = row?.admin_notes || ''
}

const { loading, error, load: loadInquiry, retry } = usePageLoad(async () => {
  notesError.value = ''
  statusError.value = ''
  const id = inquiryId.value
  if (!isUuid(id)) {
    inquiry.value = null
    return
  }
  const row = await fetchInquiry(id)
  inquiry.value = row
  if (row) syncNotes(row)
})

const emailHref = computed(() =>
  mailtoReply(inquiry.value?.email, inquiry.value?.subject || inquiryTypeLabel(inquiry.value?.type))
)

const phoneHref = computed(() => telHref(inquiry.value?.phone))

const productHref = computed(() => productUrl(inquiry.value?.related_product_slug))

const pairHref = computed(() => pairUrl(inquiry.value?.related_pair_slug))

const normalizedNotes = computed(() => String(notes.value || '').trim() || null)

const notesChanged = computed(() => {
  if (!inquiry.value) return false
  return normalizedNotes.value !== (inquiry.value.admin_notes || null)
})

const canSaveNotes = computed(() =>
  !savingNotes.value && !loading.value && notesChanged.value
)

const setStatus = async (status) => {
  if (!inquiry.value || inquiry.value.status === status || savingStatus.value) return
  if (!INQUIRY_STATUSES.includes(status)) return
  savingStatus.value = true
  pendingStatus.value = status
  statusError.value = ''
  statusMessage.value = ''
  try {
    const saved = await updateInquiry(inquiry.value.id, { status })
    inquiry.value = {
      ...inquiry.value,
      ...saved,
      admin_notes: inquiry.value.admin_notes
    }
    statusMessage.value = `Marked ${inquiryStatusLabel(status).toLowerCase()}`
  } catch (err) {
    statusError.value = err?.message || 'Could not update status'
  } finally {
    savingStatus.value = false
    pendingStatus.value = ''
  }
}

const saveNotes = async () => {
  if (!canSaveNotes.value || !inquiry.value) return
  savingNotes.value = true
  notesError.value = ''
  notesMessage.value = ''
  try {
    const saved = await updateInquiry(inquiry.value.id, { admin_notes: normalizedNotes.value })
    inquiry.value = { ...inquiry.value, ...saved }
    syncNotes(inquiry.value)
    notesMessage.value = 'Saved'
  } catch (err) {
    notesError.value = err?.message || 'Could not save notes'
  } finally {
    savingNotes.value = false
  }
}

watch(inquiryId, () => {
  inquiry.value = null
  notes.value = ''
  notesMessage.value = ''
  notesError.value = ''
  statusMessage.value = ''
  statusError.value = ''
  loadInquiry()
})

onMounted(async () => {
  await loadInquiry()
})
</script>

<style scoped>
.ios-field,
.ios-field:focus,
.ios-field:hover,
.ios-field:disabled,
textarea.ios-field {
  font-size: 16px !important;
}
</style>
