<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-4">Admin</h1>
      <p class="text-base-content/70">Users, tanks, and account</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <NuxtLink to="/admin/users" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <div class="card-body">
          <h2 class="card-title">
            <Icon name="mdi:account-group" class="w-6 h-6 text-primary" />
            Users
          </h2>
          <p class="text-base-content/70">Manage accounts and roles</p>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/tanks" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <div class="card-body">
          <h2 class="card-title">
            <Icon name="mdi:water" class="w-6 h-6 text-primary" />
            Tanks
          </h2>
          <p class="text-base-content/70">Labels, bank layout, and roles</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})
</script>
