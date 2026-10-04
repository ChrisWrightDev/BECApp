<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-start justify-between gap-3 mb-6">
      <div class="min-w-0">
        <h1 class="text-4xl font-bold mb-2">Inquiries</h1>
        <p class="text-base-content/70">Messages visitors send on the website</p>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-circle shrink-0"
        aria-label="Refresh"
        :disabled="loading"
        @click="loadInquiries"
      >
        <Icon name="mdi:refresh" class="w-5 h-5" :class="{ 'animate-spin': loading && inquiries.length }" />
      </button>
    </div>

    <PageLoadState
      :loading="loading && inquiries.length === 0"
      :error="inquiries.length ? null : error"
      :empty="false"
      @retry="retry"
    >
      <div v-if="error && inquiries.length" class="alert alert-error mb-4">
        <Icon name="mdi:alert-circle" class="w-5 h-5 shrink-0" />
        <span>{{ error }}</span>
        <button type="button" class="btn btn-sm" @click="retry">Retry</button>
      </div>

      <div
        class="flex gap-2 overflow-x-auto chip-row pb-1 mb-4"
        role="group"
        aria-label="Filter inquiries"
      >
        <button
          v-for="chip in INQUIRY_FILTERS"
          :key="chip.id"
          type="button"
          class="btn btn-sm min-h-11 h-11 rounded-full px-4 shrink-0"
          :class="filter === chip.id ? 'btn-primary' : 'btn-ghost bg-base-200'"
          :aria-pressed="filter === chip.id"
          @click="filter = chip.id"
        >
          {{ chip.label }}
        </button>
      </div>

      <p class="sr-only" aria-live="polite">{{ visibleInquiries.length }} inquiries</p>

      <PageLoadState
        :loading="false"
        :empty="visibleInquiries.length === 0"
        :empty-icon="emptyCopy.icon"
        :empty-title="emptyCopy.title"
        :empty-description="emptyCopy.description"
      >
        <div class="space-y-3">
          <NuxtLink
            v-for="row in visibleInquiries"
            :key="row.id"
            :to="`/admin/inquiries/${row.id}`"
            class="card bg-base-100 shadow-xl"
          >
            <div class="card-body p-4">
              <div class="flex items-start gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="font-semibold break-words">{{ row.name }}</p>
                    <span class="badge badge-sm shrink-0" :class="inquiryStatusBadgeClass(row.status)">
                      {{ inquiryStatusLabel(row.status) }}
                    </span>
                  </div>
                  <div class="mt-2">
                    <span class="badge badge-sm" :class="inquiryTypeBadgeClass(row.type)">
                      {{ inquiryTypeLabel(row.type) }}
                    </span>
                  </div>
                  <p class="text-sm mt-2 break-words line-clamp-2">{{ inquiryPreview(row) }}</p>
                  <p class="text-sm text-base-content/70 mt-1 break-all">
                    {{ formatOrderDate(row.created_at) }}
                    · {{ row.email }}
                  </p>
                </div>
                <Icon name="mdi:chevron-right" class="w-5 h-5 text-base-content/40 mt-0.5 shrink-0" />
              </div>
            </div>
          </NuxtLink>
        </div>
      </PageLoadState>
    </PageLoadState>
  </div>
</template>

<script setup>
import { formatOrderDate } from '~/utils/orders'
import {
  INQUIRY_FILTERS,
  emptyInquiriesCopy,
  inquiryPreview,
  inquiryStatusBadgeClass,
  inquiryStatusLabel,
  inquiryTypeBadgeClass,
  inquiryTypeLabel,
  matchesInquiryFilter
} from '~/utils/inbox'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const { fetchInquiries, fetchNewInquiryCount } = useInquiries()
const inquiries = ref([])
const filter = ref('new')

const { loading, error, load: loadInquiries, retry } = usePageLoad(async () => {
  inquiries.value = await fetchInquiries()
  fetchNewInquiryCount().catch(() => {})
})

const visibleInquiries = computed(() =>
  inquiries.value.filter((row) => matchesInquiryFilter(row, filter.value))
)

const emptyCopy = computed(() => emptyInquiriesCopy(filter.value))

onMounted(async () => {
  await loadInquiries()
})
</script>

<style scoped>
.chip-row {
  scrollbar-width: none;
}

.chip-row::-webkit-scrollbar {
  display: none;
}
</style>
