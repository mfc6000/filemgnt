import { defineStore } from 'pinia';
import http from '@/api/http';
import type { AppLocale } from '@/locales';
import { defaultLocale, supportedLocales } from '@/locales';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

interface LoginPayload {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'auth_user';
const LOCALE_KEY = 'app_locale';

const getInitialToken = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem(TOKEN_KEY) ?? '';
};

const getInitialUser = (): AuthUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch (error) {
    console.warn('Failed to parse stored user payload', error);
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: getInitialUser() as AuthUser | null,
    token: getInitialToken(),
  }),
  getters: {
    isAuthenticated: state => Boolean(state.token),
    isAdmin: state => state.user?.role === 'admin',
  },
  actions: {
    async login(payload: LoginPayload) {
      const { data } = await http.post<LoginResponse>('/auth/login', payload);
      this.user = data.user;
      this.token = data.token;

      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }

      return data.user;
    },
    logout() {
      this.user = null;
      this.token = '';

      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    },
  },
});

const isSupportedLocale = (locale: string): locale is AppLocale =>
  supportedLocales.includes(locale as AppLocale);

const getInitialLocale = (): AppLocale => {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored && isSupportedLocale(stored)) {
    return stored;
  }

  return defaultLocale;
};

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    locale: getInitialLocale(),
  }),
  actions: {
    setLocale(nextLocale: AppLocale) {
      if (!isSupportedLocale(nextLocale)) {
        return;
      }

      this.locale = nextLocale;

      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCALE_KEY, nextLocale);
      }
    },
  },
});
