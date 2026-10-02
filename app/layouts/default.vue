<template>
  <div class="min-h-screen bg-base-100 flex flex-col">
    <AppNavbar class="flex-shrink-0" />

    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>

    <AppDock />

    <footer class="hidden md:block bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 border-t-4 border-blue-500 relative overflow-hidden">
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
              <li><NuxtLink to="/reminders" class="text-blue-200 hover:text-cyan-300 transition-colors duration-200">Reminders</NuxtLink></li>
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
const currentYear = new Date().getFullYear()
const { fetchUnreadCount } = useUnreadCount()

onMounted(() => {
  fetchUnreadCount()
})

watch(() => route.path, () => {
  fetchUnreadCount()
})
</script>
