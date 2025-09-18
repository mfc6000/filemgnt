<template>
  <a-layout class="app-shell">
    <a-layout-header class="app-header">
      <div class="brand">
        <a-typography-title :heading="5">File Management</a-typography-title>
        <span class="tagline">Organize, search, and share securely</span>
      </div>
      <div class="header-actions">
        <a-space :size="12" align="center">
          <a-button type="text" class="header-link">Docs</a-button>
          <a-button type="primary" shape="round">Login</a-button>
        </a-space>
      </div>
    </a-layout-header>
    <a-layout-content class="app-content">
      <router-view />
    </a-layout-content>
  </a-layout>
</template>

<script setup lang="ts">
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
}

.brand .tagline {
  font-size: 0.75rem;
  color: var(--color-text-3);
}

.header-actions {
  display: flex;
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
