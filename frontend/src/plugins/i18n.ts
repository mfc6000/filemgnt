import { createI18n } from 'vue-i18n';
import { defaultLocale, fallbackLocale, messages } from '@/locales';

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale,
  messages,
  globalInjection: true,
});
