<template>
  <div class="login-page">
    <a-card class="login-card" :bordered="false" hoverable>
      <template #title>
        <div class="card-title">
          <a-typography-title :heading="4">Sign in</a-typography-title>
          <a-typography-text type="secondary">
            Access your repositories and manage files
          </a-typography-text>
        </div>
      </template>

      <a-form :model="form" layout="vertical" @submit.prevent="handleSubmit">
        <a-form-item label="Username" field="username" :rules="usernameRules">
          <a-input
            v-model="form.username"
            placeholder="Enter username"
            allow-clear
            autocomplete="username"
          />
        </a-form-item>
        <a-form-item label="Password" field="password" :rules="passwordRules">
          <a-input-password
            v-model="form.password"
            placeholder="Enter password"
            allow-clear
            autocomplete="current-password"
          />
        </a-form-item>

        <a-space direction="vertical" :size="16" class="submit-section">
          <a-button type="primary" html-type="submit" long :loading="loading">
            Login
          </a-button>
          <a-typography-text type="secondary" class="hint">
            Use the credentials provisioned by your administrator.
          </a-typography-text>
        </a-space>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { useAuthStore } from '@/store';

interface LoginForm {
  username: string;
  password: string;
}

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const form = reactive<LoginForm>({
  username: '',
  password: '',
});

const loading = ref(false);

const usernameRules = computed(() => [
  { required: true, message: 'Please input username' },
]);

const passwordRules = computed(() => [
  { required: true, message: 'Please input password' },
]);

const redirectAfterLogin = () => {
  const redirectPath = route.query.redirect;
  if (typeof redirectPath === 'string' && redirectPath.length > 0) {
    router.replace(redirectPath);
    return;
  }

  router.replace({ name: 'home' });
};

const handleSubmit = async () => {
  if (!form.username || !form.password) {
    Message.warning('Please fill in both username and password.');
    return;
  }

  loading.value = true;
  try {
    await authStore.login({ ...form });
    Message.success('Login successful');
    redirectAfterLogin();
  } catch (error: unknown) {
    const message =
      (error as any)?.response?.data?.error?.message ?? 'Login failed, please try again.';
    Message.error(message);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (authStore.isAuthenticated) {
    redirectAfterLogin();
  }
});
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(38, 102, 215, 0.12), rgba(113, 74, 227, 0.12));
}

.login-card {
  max-width: 420px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(22, 93, 255, 0.12);
  border-radius: 18px;
}

.card-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.submit-section {
  width: 100%;
}

.hint {
  text-align: center;
}
</style>
