<template>
  <div>
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="error" class="alert alert-error">
      <Icon name="mdi:alert-circle" class="w-6 h-6 shrink-0" />
      <span>{{ errorMessage }}</span>
      <button type="button" class="btn btn-sm" @click="$emit('retry')">
        Retry
      </button>
    </div>

    <div v-else-if="empty" class="text-center py-12">
      <div class="hero bg-base-200 rounded-lg">
        <div class="hero-content text-center">
          <div class="max-w-md">
            <Icon :name="emptyIcon" class="w-16 h-16 mx-auto mb-4 text-base-content/50" />
            <h2 class="text-2xl font-bold mb-2">{{ emptyTitle }}</h2>
            <p v-if="emptyDescription" class="text-base-content/70">{{ emptyDescription }}</p>
            <slot name="empty-action" />
          </div>
        </div>
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
