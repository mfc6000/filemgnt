<template>
  <a-layout class="app-shell">
    <a-layout-header class="app-header">
      <div class="brand" role="button" tabindex="0" @click="goHome" @keyup.enter="goHome">
        <a-typography-title :heading="5">File Management</a-typography-title>
        <span class="tagline">Organize, search, and share securely</span>
      </div>
      <div class="header-actions">
        <a-space :size="12" align="center">
          <template v-if="isAuthenticated">
            <a-typography-text class="welcome-text">
              Hello, <strong>{{ username }}</strong>
            </a-typography-text>
            <a-tag v-if="isAdmin" color="orangered" bordered>Admin</a-tag>
            <a-button type="outline" size="small" @click="handleLogout">Logout</a-button>
          </template>
          <template v-else>
            <a-button type="text" class="header-link" @click="openDocs">Docs</a-button>
            <a-button type="primary" shape="round" @click="goLogin">Login</a-button>
          </template>
        </a-space>
      </div>
    </a-layout-header>
    <a-layout-content class="app-content">
      <router-view />
    </a-layout-content>
  </a-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store';

const router = useRouter();
const authStore = useAuthStore();

const isAuthenticated = computed(() => authStore.isAuthenticated);
const isAdmin = computed(() => authStore.isAdmin);
const username = computed(() => authStore.user?.username ?? '');

const goLogin = () => {
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
};

const handleLogout = () => {
  authStore.logout();
  router.push({ name: 'login' });
};

const goHome = () => {
  if (isAuthenticated.value) {
    router.push({ name: 'home' });
  } else {
    router.push({ name: 'login' });
  }
};

const openDocs = () => {
  window.open('https://example.com/docs', '_blank');
};
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--color-bg-1);
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.brand {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.brand:focus-visible {
  outline: 2px solid var(--color-primary-6);
  outline-offset: 4px;
}

.brand .tagline {
  font-size: 0.75rem;
  color: var(--color-text-3);
}

.header-actions {
  display: flex;
  align-items: center;
}

.header-link {
  color: var(--color-text-1);
}

.welcome-text {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.app-content {
  padding: 1.5rem;
}

@media (max-width: 640px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .app-content {
    padding: 1rem 0.75rem 2rem;
  }
}
</style>
