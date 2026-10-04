<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-start justify-between gap-3 mb-6">
      <div class="min-w-0">
        <h1 class="text-4xl font-bold mb-2">Subscribers</h1>
        <p class="text-base-content/70">Release list from the website</p>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-circle shrink-0"
        aria-label="Refresh"
        :disabled="loading"
        @click="loadSubscribers"
      >
        <Icon name="mdi:refresh" class="w-5 h-5" :class="{ 'animate-spin': loading && subscribers.length }" />
      </button>
    </div>

    <PageLoadState
      :loading="loading && subscribers.length === 0"
      :error="subscribers.length ? null : error"
      :empty="!loading && !error && subscribers.length === 0"
      empty-icon="mdi:email-newsletter"
      empty-title="No subscribers yet"
      empty-description="People who join the release list show up here"
      @retry="retry"
    >
      <div v-if="error && subscribers.length" class="alert alert-error mb-4">
        <Icon name="mdi:alert-circle" class="w-5 h-5 shrink-0" />
        <span>{{ error }}</span>
        <button type="button" class="btn btn-sm" @click="retry">Retry</button>
      </div>

      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="rounded-box bg-base-200 px-3 py-3 text-center">
          <p class="text-2xl font-bold">{{ subscribedCount }}</p>
          <p class="text-xs text-base-content/70">Subscribed</p>
        </div>
        <div class="rounded-box bg-base-200 px-3 py-3 text-center">
          <p class="text-2xl font-bold">{{ unsubscribedCount }}</p>
          <p class="text-xs text-base-content/70">Unsubscribed</p>
        </div>
        <div class="rounded-box bg-base-200 px-3 py-3 text-center">
          <p class="text-2xl font-bold">{{ subscribers.length }}</p>
          <p class="text-xs text-base-content/70">Total</p>
        </div>
      </div>

      <div class="flex flex-col gap-2 mb-4">
        <button
          type="button"
          class="btn btn-primary w-full"
          :disabled="emailList.length === 0"
          @click="copyEmails"
        >
          <Icon :name="copied ? 'mdi:check' : 'mdi:content-copy'" class="w-5 h-5" />
          {{ copied ? 'Copied' : 'Copy all subscribed emails' }}
        </button>
        <button
          type="button"
          class="btn btn-outline w-full"
          :disabled="subscribers.length === 0"
          @click="downloadCsv"
        >
          <Icon name="mdi:download" class="w-5 h-5" />
          Download CSV
        </button>
        <p v-if="copyError" class="text-error text-sm" role="alert">{{ copyError }}</p>
        <p v-else-if="copied" class="text-success text-sm" role="status">
          Copied {{ emailList.length === 1 ? '1 email' : `${emailList.length} emails` }}
        </p>
      </div>

      <div class="space-y-3">
        <article
          v-for="row in subscribers"
          :key="row.id"
          class="card bg-base-100 shadow-xl"
        >
          <div class="card-body p-4 gap-2">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold break-words">{{ row.name || 'No name' }}</p>
                <a
                  v-if="mailtoAddress(row.email)"
                  class="link link-hover break-all text-sm"
                  :href="mailtoAddress(row.email)"
                >
                  {{ row.email }}
                </a>
                <p v-else class="text-sm break-all">{{ row.email }}</p>
              </div>
              <span class="badge badge-sm shrink-0" :class="subscriberStatusBadgeClass(row.status)">
                {{ subscriberStatusLabel(row.status) }}
              </span>
            </div>
            <p class="text-sm text-base-content/70">
              {{ sourceLabel(row.source) }}
              · {{ formatOrderDate(row.created_at) }}
            </p>
            <p v-if="row.unsubscribed_at" class="text-xs text-base-content/60">
              Unsubscribed {{ formatOrderDate(row.unsubscribed_at) }}
            </p>
          </div>
        </article>
      </div>
    </PageLoadState>
  </div>
</template>

<script setup>
import { formatOrderDate } from '~/utils/orders'
import {
  mailtoAddress,
  sourceLabel,
  subscribedEmails,
  subscriberStatusBadgeClass,
  subscriberStatusLabel,
  subscribersToCsv
} from '~/utils/inbox'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const { fetchSubscribers } = useSubscribers()
const subscribers = ref([])
const copied = ref(false)
const copyError = ref('')

const { loading, error, load: loadSubscribers, retry } = usePageLoad(async () => {
  subscribers.value = await fetchSubscribers()
})

const emailList = computed(() => subscribedEmails(subscribers.value))

const subscribedCount = computed(() =>
  subscribers.value.filter((row) => row.status === 'subscribed').length
)

const unsubscribedCount = computed(() =>
  subscribers.value.filter((row) => row.status === 'unsubscribed').length
)

const copyEmails = async () => {
  copyError.value = ''
  const emails = emailList.value
  if (!emails.length) return
  try {
    await navigator.clipboard.writeText(emails.join(', '))
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    copyError.value = 'Could not copy emails'
  }
}

const downloadCsv = () => {
  const csv = subscribersToCsv(subscribers.value)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'release-list.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  await loadSubscribers()
})
</script>
