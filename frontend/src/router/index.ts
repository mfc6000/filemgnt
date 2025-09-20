import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  RouteRecordRaw,
} from 'vue-router';

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

const history = typeof window !== 'undefined'
  ? createWebHistory(import.meta.env.BASE_URL)
  : createMemoryHistory();

const router = createRouter({
  history,
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: 'home' };
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    const redirectTarget =
      typeof to.query.redirect === 'string' && to.query.redirect.length > 0
        ? { path: to.query.redirect }
        : { name: 'home' };
    return redirectTarget;
  }

  return true;
});

router.afterEach((to) => {
  if (typeof window !== 'undefined' && to.meta?.title) {
    document.title = `${to.meta.title as string} - File Management`;
  }
});

export default router;
