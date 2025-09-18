<template>
  <div class="home-view">
    <a-card class="welcome-card" :bordered="false">
      <template #title>
        Welcome to the File Management System
      </template>
      <p>
        This is a placeholder view. Start wiring up repository, file, and search modules here.
      </p>
    </a-card>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.home-view {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
}

.welcome-card {
  max-width: 720px;
  width: 100%;
}
</style>
