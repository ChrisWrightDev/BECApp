<template>
  <div class="app-shell" :class="{ 'is-chat': isChat, 'is-home': isHome }">
    <AppTopBar />
    <main class="app-main" :class="{ 'app-main--flush': isChat, 'app-main--home': isHome }">
      <slot />
    </main>
    <AppTabBar />
  </div>
</template>

<script setup>
const route = useRoute()
const isChat = computed(() => route.path === '/chat')
const isHome = computed(() => route.path === '/')
</script>
