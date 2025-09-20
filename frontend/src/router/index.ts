import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  RouteRecordRaw,
} from 'vue-router';
import { useAuthStore } from '@/store';
import { i18n } from '@/plugins/i18n';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { titleKey: 'router.home', requiresAuth: true },
  },
  {
    path: '/repos',
    name: 'repos',
    component: () => import('@/views/ReposView.vue'),
    meta: { titleKey: 'router.repos', requiresAuth: true },
  },
  {
    path: '/repos/:id',
    name: 'repo-detail',
    component: () => import('@/views/RepoDetailView.vue'),
    meta: { titleKey: 'router.repoDetail', requiresAuth: true },
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/views/AdminUsersView.vue'),
    meta: { titleKey: 'router.adminUsers', requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { titleKey: 'router.login' },
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
  if (typeof window !== 'undefined' && to.meta?.titleKey) {
    const titleKey = to.meta.titleKey as string;
    const pageTitle = i18n.global.t(titleKey);
    const appName = i18n.global.t('common.appName');
    document.title = `${pageTitle} - ${appName}`;
  }
});

export default router;
