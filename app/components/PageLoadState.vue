<template>
  <div>
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="error" class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <div class="alert alert-error mb-4 text-left">
          <Icon name="mdi:alert-circle" class="w-6 h-6" />
          <span>{{ errorMessage }}</span>
        </div>
        <button type="button" class="btn btn-primary" @click="$emit('retry')">
          <Icon name="mdi:refresh" class="w-5 h-5" />
          Retry
        </button>
      </div>
    </div>

    <div v-else-if="empty" class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <Icon :name="emptyIcon" class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <p class="text-lg text-base-content/70">{{ emptyTitle }}</p>
        <p v-if="emptyDescription" class="text-sm text-base-content/50 mt-2">
          {{ emptyDescription }}
        </p>
        <slot name="empty-action" />
      </div>
    </div>

    <slot v-else />
  </div>
</template>

<script setup>
const props = defineProps({
  loading: { type: Boolean, default: false },
  error: { type: [String, Object, Error], default: null },
  empty: { type: Boolean, default: false },
  emptyIcon: { type: String, default: 'mdi:inbox-outline' },
  emptyTitle: { type: String, default: 'Nothing to show' },
  emptyDescription: { type: String, default: '' }
})

defineEmits(['retry'])

const errorMessage = computed(() => {
  if (!props.error) return ''
  if (typeof props.error === 'string') return props.error
  return props.error.message || 'Failed to load data'
})
</script>
