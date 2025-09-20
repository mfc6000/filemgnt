<template>
  <div class="admin-users">
    <a-space direction="vertical" :size="16" fill>
      <a-card :bordered="false">
        <template #title>
          {{ t('adminUsers.title') }}
        </template>
        <p class="card-description">
          {{ t('adminUsers.description') }}
        </p>
        <a-divider />
        <a-form layout="vertical" class="user-form" :model="form" :disabled="creating">
          <a-row :gutter="16">
            <a-col :xs="24" :sm="12">
              <a-form-item
                :label="t('adminUsers.form.usernameLabel')"
                field="username"
                :validate-status="usernameStatus || undefined"
              >
                <a-input
                  v-model="form.username"
                  :placeholder="t('adminUsers.form.usernamePlaceholder')"
                  allow-clear
                  @press-enter="handleCreate"
                />
                <template v-if="usernameErrorMessage" #extra>
                  <a-typography-text type="danger">{{ usernameErrorMessage }}</a-typography-text>
                </template>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12">
              <a-form-item :label="t('adminUsers.form.displayNameLabel')" field="displayName">
                <a-input
                  v-model="form.displayName"
                  :placeholder="t('adminUsers.form.displayNamePlaceholder')"
                  allow-clear
                  @press-enter="handleCreate"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12">
              <a-form-item :label="t('adminUsers.form.roleLabel')" field="role">
                <a-select v-model="form.role">
                  <a-option value="user">{{ t('common.roles.user') }}</a-option>
                  <a-option value="admin">{{ t('common.roles.admin') }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12">
              <a-form-item :label="t('adminUsers.form.passwordLabel')" field="password">
                <a-input-password
                  v-model="form.password"
                  :placeholder="t('adminUsers.form.passwordPlaceholder')"
                  allow-clear
                  @press-enter="handleCreate"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <div class="form-actions">
            <a-button type="primary" :loading="creating" @click="handleCreate">
              {{ t('adminUsers.form.submit') }}
            </a-button>
          </div>
        </a-form>
      </a-card>

      <a-card :bordered="false">
        <template #title>
          {{ t('adminUsers.table.title') }}
        </template>
        <a-table
          row-key="id"
          :data="users"
          :loading="loading"
          :pagination="pagination"
          :columns="columns"
          class="users-table"
        >
          <template #role="{ record }">
            <a-tag :color="record.role === 'admin' ? 'orangered' : 'arcoblue'">
              {{ t(`common.roles.${record.role}`) }}
            </a-tag>
          </template>
          <template #status="{ record }">
            <a-tag :color="record.isActive ? 'green' : 'gray'">
              {{ record.isActive ? t('common.status.active') : t('common.status.inactive') }}
            </a-tag>
          </template>
          <template #updatedAt="{ record }">
            {{ formatDate(record.updatedAt) }}
          </template>
          <template #actions="{ record }">
            <a-space :size="8">
              <a-button type="text" size="mini" @click="toggleRole(record)">
                {{
                  record.role === 'admin'
                    ? t('adminUsers.table.actions.setUser')
                    : t('adminUsers.table.actions.makeAdmin')
                }}
              </a-button>
              <a-button type="text" size="mini" status="danger" @click="confirmDeactivate(record)">
                {{
                  record.isActive
                    ? t('adminUsers.table.actions.deactivate')
                    : t('adminUsers.table.actions.delete')
                }}
              </a-button>
            </a-space>
          </template>
        </a-table>
      </a-card>
    </a-space>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { isAxiosError } from 'axios';
import { Message, Modal } from '@arco-design/web-vue';
import http from '@/api/http';
import { useI18n } from 'vue-i18n';

interface AdminUserItem {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'user';
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  data: AdminUserItem[];
}

const { t } = useI18n();

const users = ref<AdminUserItem[]>([]);
const loading = ref(false);
const creating = ref(false);
const usernameStatus = ref<'error' | ''>('');
const usernameErrorMessage = ref('');
const form = reactive({
  username: '',
  displayName: '',
  role: 'user' as 'user' | 'admin',
  password: '',
});

const pagination = computed(() => ({
  pageSize: 10,
  simple: true,
}));

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const columns = computed(() => [
  { title: t('adminUsers.table.columns.username'), dataIndex: 'username' },
  { title: t('adminUsers.table.columns.displayName'), dataIndex: 'displayName' },
  { title: t('adminUsers.table.columns.role'), slotName: 'role', width: 120 },
  { title: t('adminUsers.table.columns.status'), slotName: 'status', width: 120 },
  { title: t('adminUsers.table.columns.updated'), slotName: 'updatedAt', width: 200 },
  { title: t('adminUsers.table.columns.actions'), slotName: 'actions', width: 200 },
]);

const fetchUsers = async () => {
  loading.value = true;
  try {
    const { data } = await http.get<UsersResponse>('/admin/users');
    users.value = data.data ?? [];
  } catch (error) {
    if (isAxiosError(error)) {
      Message.error(error.response?.data?.error?.message ?? t('adminUsers.messages.loadFailed'));
    } else {
      Message.error(t('adminUsers.messages.loadUnexpected'));
    }
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  form.username = '';
  form.displayName = '';
  form.role = 'user';
  form.password = '';
  usernameStatus.value = '';
  usernameErrorMessage.value = '';
};

const handleCreate = async () => {
  const trimmed = form.username.trim();
  if (!trimmed) {
    usernameStatus.value = 'error';
    usernameErrorMessage.value = t('adminUsers.form.validation.usernameRequired');
    return;
  }

  creating.value = true;
  usernameStatus.value = '';
  usernameErrorMessage.value = '';

  try {
    const payload = {
      username: trimmed,
      displayName: form.displayName.trim() || undefined,
      role: form.role,
      password: form.password || undefined,
    };
    const { data } = await http.post('/admin/users', payload);
    const created = data?.data as AdminUserItem | undefined;
    if (created) {
      users.value = [created, ...users.value];
    }
    Message.success({
      content: t('adminUsers.messages.createSuccess', { username: trimmed }),
      duration: 2000,
    });
    resetForm();
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.error?.message ?? error.message;
      if (error.response?.status === 409) {
        usernameStatus.value = 'error';
        usernameErrorMessage.value = t('adminUsers.form.validation.usernameExists');
      }
      Message.error(message || t('adminUsers.messages.createFailed'));
    } else {
      Message.error(t('adminUsers.messages.createUnexpected'));
    }
  } finally {
    creating.value = false;
  }
};

const toggleRole = async (record: AdminUserItem) => {
  const nextRole = record.role === 'admin' ? 'user' : 'admin';
  try {
    await http.put(`/admin/users/${record.id}`, { role: nextRole });
    record.role = nextRole;
    Message.success({
      content: t('adminUsers.messages.roleUpdated', { role: t(`common.roles.${nextRole}`) }),
      duration: 1500,
    });
  } catch (error) {
    if (isAxiosError(error)) {
      Message.error(error.response?.data?.error?.message ?? t('adminUsers.messages.roleFailed'));
    } else {
      Message.error(t('adminUsers.messages.roleUnexpected'));
    }
  }
};

const confirmDeactivate = (record: AdminUserItem) => {
  const title = record.isActive
    ? t('adminUsers.confirm.deactivateTitle')
    : t('adminUsers.confirm.deleteTitle');
  const content = record.isActive
    ? t('adminUsers.confirm.deactivateMessage', { username: record.username })
    : t('adminUsers.confirm.deleteMessage', { username: record.username });
  const okText = record.isActive
    ? t('adminUsers.confirm.deactivateAction')
    : t('adminUsers.confirm.deleteAction');

  Modal.confirm({
    title,
    content,
    okText,
    okButtonProps: { status: 'danger' },
    cancelText: t('common.actions.cancel'),
    onOk: () => deactivateUser(record),
  });
};

const deactivateUser = async (record: AdminUserItem) => {
  try {
    await http.delete(`/admin/users/${record.id}`);
    users.value = users.value.filter(user => user.id !== record.id);
    Message.success({ content: t('adminUsers.messages.removeSuccess'), duration: 1500 });
  } catch (error) {
    if (isAxiosError(error)) {
      Message.error(error.response?.data?.error?.message ?? t('adminUsers.messages.removeFailed'));
    } else {
      Message.error(t('adminUsers.messages.removeUnexpected'));
    }
  }
};

onMounted(fetchUsers);
</script>

<style scoped>
.admin-users {
  padding: 0.5rem 0 2rem;
}

.card-description {
  margin: 0;
  color: var(--color-text-3);
}

.user-form {
  margin-top: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .form-actions {
    justify-content: stretch;
  }

  .form-actions .arco-btn {
    width: 100%;
  }
}
</style>
