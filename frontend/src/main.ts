import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ArcoVue from '@arco-design/web-vue';
import '@arco-design/web-vue/dist/arco.css';

import App from './App.vue';
import router from './router';
import { i18n } from './plugins/i18n';
import { useLocaleStore } from '@/store';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(ArcoVue);
app.use(i18n);

const localeStore = useLocaleStore(pinia);
i18n.global.locale.value = localeStore.locale;

localeStore.$subscribe((_, state) => {
  i18n.global.locale.value = state.locale;
});

app.mount('#app');
