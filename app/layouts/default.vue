<template>
  <div
    class="bg-base-100 flex flex-col"
    :class="isChat ? 'chat-shell' : 'min-h-screen'"
  >
    <AppNavbar class="flex-shrink-0" />

    <main class="flex-1 min-h-0" :class="isChat ? 'chat-main' : 'pb-20 md:pb-0'">
      <slot />
    </main>

    <AppDock />

    <footer
      v-if="!isChat"
      class="hidden md:block bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 border-t-4 border-blue-500 relative overflow-hidden"
    >
      <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 opacity-30"></div>
      <div class="container mx-auto px-4 py-8 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <div class="flex items-center space-x-3 mb-4">
              <img src="/images/logo.png" alt="Blue Eyed Clowns" class="h-12 w-auto" />
              <div>
                <h3 class="text-4xl text-white pirate-font-light">Blue Eyed Clowns</h3>
                <p class="text-blue-200 text-sm">Clownfish hatchery</p>
              </div>
            </div>
            <p class="text-blue-200 text-sm leading-relaxed">
              Track hatches, pairs, and daily checklists for the Blue Eyed Clowns facility.
            </p>
          </div>
          <div>
            <h4 class="text-3xl text-white mb-4 pirate-font-light">Navigation</h4>
            <ul class="space-y-2">
              <li><NuxtLink to="/hatches" class="text-blue-200 hover:text-cyan-300 transition-colors duration-200">Hatches</NuxtLink></li>
              <li><NuxtLink to="/pairs" class="text-blue-200 hover:text-cyan-300 transition-colors duration-200">Pairs</NuxtLink></li>
              <li><NuxtLink to="/checklist" class="text-blue-200 hover:text-cyan-300 transition-colors duration-200">Checklists</NuxtLink></li>
              <li><NuxtLink to="/chat" class="text-blue-200 hover:text-cyan-300 transition-colors duration-200">Chat</NuxtLink></li>
            </ul>
          </div>
          <div>
            <h4 class="text-3xl text-white mb-4 pirate-font-light">Hatchery</h4>
            <p class="text-blue-200 text-sm italic leading-relaxed">
              Current batches, mated pairs, and the daily floor checklist — in one place.
            </p>
          </div>
        </div>
        <div class="border-t border-blue-700 mt-8 pt-6 text-blue-300 text-sm">
          © {{ currentYear }} Blue Eyed Clowns. All rights reserved.
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
const route = useRoute()
const isChat = computed(() => route.path === '/chat')
const currentYear = new Date().getFullYear()
const { fetchUnreadCount } = useUnreadCount()

const KEYBOARD_INSET_THRESHOLD = 150
let unbindChatViewport = () => {}

const syncChatViewport = () => {
  if (typeof window === 'undefined' || !isChat.value) return

  const root = document.documentElement
  const vv = window.visualViewport
  const height = Math.round(vv?.height || window.innerHeight)
  const offsetTop = Math.round(vv?.offsetTop || 0)

  root.style.setProperty('--app-vvh', `${height}px`)
  root.style.setProperty('--app-vv-top', `${offsetTop}px`)

  const isMobile = window.matchMedia('(max-width: 767px)').matches
  const keyboardInset = vv
    ? Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0))
    : 0
  const keyboardOpen = isMobile && keyboardInset > KEYBOARD_INSET_THRESHOLD

  let inset = 0
  if (isMobile && !keyboardOpen) {
    const dock = document.querySelector('[data-app-dock]')
    inset = dock?.offsetHeight || Math.round(5.5 * 16)
  }

  root.style.setProperty('--app-chat-bottom-inset', `${inset}px`)
  root.classList.toggle('chat-keyboard-open', keyboardOpen)
}

const bindChatViewport = () => {
  if (typeof window === 'undefined') return

  document.documentElement.classList.add('chat-open')
  syncChatViewport()

  const vv = window.visualViewport
  vv?.addEventListener('resize', syncChatViewport)
  vv?.addEventListener('scroll', syncChatViewport)
  window.addEventListener('resize', syncChatViewport)

  const dock = document.querySelector('[data-app-dock]')
  let observer
  if (dock && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(syncChatViewport)
    observer.observe(dock)
  }

  unbindChatViewport = () => {
    vv?.removeEventListener('resize', syncChatViewport)
    vv?.removeEventListener('scroll', syncChatViewport)
    window.removeEventListener('resize', syncChatViewport)
    observer?.disconnect()

    const root = document.documentElement
    root.classList.remove('chat-open', 'chat-keyboard-open')
    root.style.removeProperty('--app-vvh')
    root.style.removeProperty('--app-vv-top')
    root.style.removeProperty('--app-chat-bottom-inset')
    unbindChatViewport = () => {}
  }
}

onMounted(() => {
  fetchUnreadCount()
  if (isChat.value) bindChatViewport()
})

watch(isChat, (chat) => {
  unbindChatViewport()
  if (chat) bindChatViewport()
})

watch(() => route.path, (path) => {
  if (path !== '/chat') fetchUnreadCount()
})

onUnmounted(() => {
  unbindChatViewport()
})
</script>
