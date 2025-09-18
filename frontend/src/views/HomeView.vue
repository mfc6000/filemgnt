<template>
  <div class="home-view">
    <a-card class="welcome-card" :bordered="false">
      <template #title>
        Welcome to the File Management System
      </template>
      <p>
        Hi <strong>{{ username }}</strong>! Use the navigation to manage repositories, upload documents,
        and search across your synced knowledge base.
      </p>
      <a-divider />
      <p>
        This area will host dashboards, quick actions, and helpful summaries in future iterations.
        For now, the authenticated shell and routing guards are ready for feature development.
      </p>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/store';

const authStore = useAuthStore();
const username = computed(() => authStore.user?.username ?? 'there');
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
