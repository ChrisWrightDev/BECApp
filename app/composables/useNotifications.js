export const useNotifications = () => {
  const notifications = useState('notifications', () => [])

  const showNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now().toString()
    const notification = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration,
      timestamp: new Date()
    }

    notifications.value.push(notification)

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }

  const showSuccess = (message, duration = 5000) => {
    return showNotification(message, 'success', duration)
  }

  const showError = (message, duration = 5000) => {
    return showNotification(message, 'error', duration)
  }

  const showWarning = (message, duration = 5000) => {
    return showNotification(message, 'warning', duration)
  }

  const showInfo = (message, duration = 5000) => {
    return showNotification(message, 'info', duration)
  }

  const removeNotification = (id) => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  const clearAll = () => {
    notifications.value = []
  }

  return {
    notifications: readonly(notifications),
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearAll
  }
}


