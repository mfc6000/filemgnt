<template>
  <div class="admin-users">
    <a-space direction="vertical" :size="16" fill>
      <a-card :bordered="false">
        <template #title>
          User management
        </template>
        <p class="card-description">
          Administrators can create new accounts, toggle roles, and deactivate users. Password delivery
          should follow your security policy.
        </p>
        <a-divider />
        <a-form
          layout="vertical"
          class="user-form"
          :model="form"
          :disabled="creating"
          @submit.prevent="handleCreate"
        >
          <a-row :gutter="16">
            <a-col :xs="24" :sm="12">
              <a-form-item label="Username" field="username" :validate-status="usernameStatus || undefined">
                <a-input v-model="form.username" placeholder="e.g. alice" allow-clear />
                <template v-if="usernameErrorMessage" #extra>
                  <a-typography-text type="danger">{{ usernameErrorMessage }}</a-typography-text>
                </template>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12">
              <a-form-item label="Display name" field="displayName">
                <a-input v-model="form.displayName" placeholder="Alice Johnson" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12">
              <a-form-item label="Role" field="role">
                <a-select v-model="form.role">
                  <a-option value="user">User</a-option>
                  <a-option value="admin">Admin</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12">
              <a-form-item label="Temporary password" field="password">
                <a-input-password v-model="form.password" placeholder="Optional initial password" allow-clear />
              </a-form-item>
            </a-col>
          </a-row>
          <div class="form-actions">
            <a-button type="primary" html-type="submit" :loading="creating">Create user</a-button>
          </div>
        </a-form>
      </a-card>

      <a-card :bordered="false">
        <template #title>
          Users
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
            <a-tag :color="record.role === 'admin' ? 'orangered' : 'arcoblue'">{{ record.role }}</a-tag>
          </template>
          <template #status="{ record }">
            <a-tag :color="record.isActive ? 'green' : 'gray'">{{ record.isActive ? 'active' : 'inactive' }}</a-tag>
          </template>
          <template #updatedAt="{ record }">
            {{ formatDate(record.updatedAt) }}
          </template>
          <template #actions="{ record }">
            <a-space :size="8">
              <a-button type="text" size="mini" @click="toggleRole(record)">
                {{ record.role === 'admin' ? 'Set as user' : 'Make admin' }}
              </a-button>
              <a-button type="text" size="mini" status="danger" @click="confirmDeactivate(record)">
                {{ record.isActive ? 'Deactivate' : 'Delete' }}
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

const columns = [
  { title: 'Username', dataIndex: 'username' },
  { title: 'Display name', dataIndex: 'displayName' },
  { title: 'Role', slotName: 'role', width: 120 },
  { title: 'Status', slotName: 'status', width: 120 },
  { title: 'Updated', slotName: 'updatedAt', width: 200 },
  { title: 'Actions', slotName: 'actions', width: 200 },
];

const fetchUsers = async () => {
  loading.value = true;
  try {
    const { data } = await http.get<UsersResponse>('/admin/users');
    users.value = data.data ?? [];
  } catch (error) {
    if (isAxiosError(error)) {
      Message.error(error.response?.data?.error?.message ?? 'Failed to load users');
    } else {
      Message.error('Unexpected error while loading users');
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
    usernameErrorMessage.value = 'Username is required';
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
    Message.success({ content: `User "${trimmed}" created`, duration: 2000 });
    resetForm();
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.error?.message ?? error.message;
      if (error.response?.status === 409) {
        usernameStatus.value = 'error';
        usernameErrorMessage.value = 'Username already exists';
      }
      Message.error(message || 'Failed to create user');
    } else {
      Message.error('Unexpected error while creating user');
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
    Message.success({ content: `Role updated to ${nextRole}`, duration: 1500 });
  } catch (error) {
    if (isAxiosError(error)) {
      Message.error(error.response?.data?.error?.message ?? 'Failed to update role');
    } else {
      Message.error('Unexpected error while updating role');
    }
  }
};

const confirmDeactivate = (record: AdminUserItem) => {
  Modal.confirm({
    title: record.isActive ? 'Deactivate user?' : 'Delete user?',
    content: `Are you sure you want to ${record.isActive ? 'deactivate' : 'remove'} ${record.username}?`,
    okText: record.isActive ? 'Deactivate' : 'Remove',
    okButtonProps: { status: 'danger' },
    onOk: () => deactivateUser(record),
  });
};

const deactivateUser = async (record: AdminUserItem) => {
  try {
    await http.delete(`/admin/users/${record.id}`);
    users.value = users.value.filter((user) => user.id !== record.id);
    Message.success({ content: 'User removed', duration: 1500 });
  } catch (error) {
    if (isAxiosError(error)) {
      Message.error(error.response?.data?.error?.message ?? 'Failed to remove user');
    } else {
      Message.error('Unexpected error while removing user');
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
