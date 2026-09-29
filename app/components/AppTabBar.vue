<template>
  <nav class="app-tabbar" aria-label="Primary">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="app-tab"
      :class="{ 'is-active': isActive(tab) }"
    >
      <Icon :name="tab.icon" class="w-6 h-6" />
      <span>{{ tab.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup>
const route = useRoute()

const tabs = [
  { to: '/', label: 'Home', icon: 'mdi:home-variant', exact: true },
  { to: '/checklist', label: 'Checklists', icon: 'mdi:checkbox-marked-outline' },
  { to: '/chat', label: 'Chat', icon: 'mdi:message-outline' },
  { to: '/hatches', label: 'Hatches', icon: 'mdi:egg-outline' },
  { to: '/pairs', label: 'Pairs', icon: 'mdi:fish' }
]

const isActive = (tab) => {
  if (tab.exact) return route.path === tab.to
  return route.path === tab.to || route.path.startsWith(`${tab.to}/`)
}
</script>
