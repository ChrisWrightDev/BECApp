<template>
  <div>
    <div class="page-header">
      <h1>Admin</h1>
      <p>Users, tanks, and account</p>
    </div>

    <div class="grid grid-cols-1 gap-3">
      <NuxtLink to="/admin/users" class="hatch-card">
        <h2 class="card-title text-base">
          <Icon name="mdi:account-group" class="w-5 h-5 text-primary" />
          Users
        </h2>
        <p class="text-sm text-base-content/70 mt-1">Manage accounts and roles</p>
      </NuxtLink>

      <NuxtLink to="/admin/tanks" class="hatch-card">
        <h2 class="card-title text-base">
          <Icon name="mdi:water" class="w-5 h-5 text-primary" />
          Tanks
        </h2>
        <p class="text-sm text-base-content/70 mt-1">Labels, bank layout, and roles</p>
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
