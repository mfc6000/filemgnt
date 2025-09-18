import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/store';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'Search', requiresAuth: true },
  },
  {
    path: '/repos',
    name: 'repos',
    component: () => import('@/views/ReposView.vue'),
    meta: { title: 'Repositories', requiresAuth: true },
  },
  {
    path: '/repos/:id',
    name: 'repo-detail',
    component: () => import('@/views/RepoDetailView.vue'),
    meta: { title: 'Repository Files', requiresAuth: true },
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/views/AdminUsersView.vue'),
    meta: { title: 'User Management', requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { title: 'Login' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'home' });
    return;
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    const redirectTarget = typeof to.query.redirect === 'string' ? to.query.redirect : '/';
    next(redirectTarget || { name: 'home' });
    return;
  }

  next();
});

router.afterEach((to) => {
  if (typeof window !== 'undefined' && to.meta?.title) {
    document.title = `${to.meta.title as string} - File Management`;
  }
});

export default router;
