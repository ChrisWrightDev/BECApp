<template>
  <div data-app-dock class="fixed bottom-0 left-0 right-0 z-50 md:hidden">
    <div class="dock dock-bottom bg-base-200/95 backdrop-blur-sm border-t border-base-300">
      <div v-for="tab in tabs" :key="tab.to" class="dock-item">
        <NuxtLink
          :to="tab.to"
          class="dock-button"
          :class="{ 'dock-button-active': isActive(tab) }"
          :aria-label="reminderAria(tab)"
        >
          <div class="relative">
            <Icon :name="tab.icon" class="w-6 h-6" />
            <div
              v-if="tab.badge && unreadCount > 0"
              class="absolute -top-0.5 -right-0.5 badge badge-error badge-xs unread-dock-badge"
            >
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </div>
            <span
              v-if="tab.reminderBadge && attentionBadgeLabel"
              class="reminder-dock-badge"
              aria-hidden="true"
            >
              {{ attentionBadgeLabel }}
            </span>
          </div>
          <span class="dock-label">{{ tab.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const { unreadCount } = useUnreadCount()
const { attentionBadgeLabel, attentionCount } = useReminders()

const tabs = [
  { to: '/', label: 'Home', icon: 'mdi:home', exact: true },
  { to: '/checklist', label: 'Checklists', icon: 'mdi:checkbox-marked-outline' },
  { to: '/chat', label: 'Chat', icon: 'mdi:message-outline', badge: true },
  { to: '/reminders', label: 'Reminders', icon: 'mdi:bell-alert-outline', reminderBadge: true },
  { to: '/hatches', label: 'Hatches', icon: 'mdi:egg-outline' }
]

const reminderAria = (tab) => {
  if (!tab.reminderBadge || !attentionBadgeLabel.value) return undefined
  const count = attentionCount.value
  const noun = count === 1 ? 'reminder' : 'reminders'
  return `${tab.label}, ${count} open ${noun}`
}

const isActive = (tab) => {
  if (tab.exact || tab.to === '/') return route.path === tab.to
  return route.path === tab.to || route.path.startsWith(`${tab.to}/`)
}
</script>

<style scoped>
.dock {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0.5rem;
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
  gap: 0.5rem;
}

.dock-item {
  flex: 1;
  display: flex;
  justify-content: center;
}

.dock-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 0.5rem;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
  color: color-mix(in srgb, var(--color-base-content) 70%, transparent);
  text-decoration: none;
  min-width: 0;
}

.dock-button:hover {
  background-color: var(--color-base-200);
  color: var(--color-base-content);
  transform: translateY(-2px);
}

.dock-button-active {
  background-color: var(--color-primary);
  color: var(--color-primary-content);
}

.dock-label {
  font-size: 0.75rem;
  margin-top: 0.25rem;
  text-align: center;
  line-height: 1;
}

.unread-dock-badge {
  animation: pulse 2s infinite;
  font-weight: bold;
  min-width: 0.75rem;
  height: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  line-height: 1;
  padding: 0;
  background-color: #dc2626 !important;
  color: white !important;
  border: none;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.reminder-dock-badge {
  position: absolute;
  top: -7px;
  right: -12px;
  z-index: 1;
  box-sizing: border-box;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background-color: #ff3b30;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  letter-spacing: -0.02em;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 0 0 2px var(--color-base-200);
}

.dock-button-active .reminder-dock-badge {
  box-shadow: 0 0 0 2px var(--color-primary);
}
</style>
