<template>
  <div class="toast toast-top toast-end z-50">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      class="alert shadow-lg mb-2 animate-in slide-in-from-top"
      :class="getNotificationClass(notification.type)"
    >
      <div class="flex items-center gap-2 flex-1">
        <Icon :name="getNotificationIcon(notification.type)" class="w-5 h-5" />
        <span>{{ notification.message }}</span>
      </div>
      <button
        @click="removeNotification(notification.id)"
        class="btn btn-sm btn-circle btn-ghost"
      >
        <Icon name="mdi:close" class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
const { notifications, removeNotification } = useNotifications()

const getNotificationClass = (type) => {
  const classes = {
    success: 'alert-success',
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info'
  }
  return classes[type] || 'alert-info'
}

const getNotificationIcon = (type) => {
  const icons = {
    success: 'mdi:check-circle',
    error: 'mdi:alert-circle',
    warning: 'mdi:alert',
    info: 'mdi:information'
  }
  return icons[type] || 'mdi:information'
}
</script>


