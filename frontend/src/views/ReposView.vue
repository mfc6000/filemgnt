<template>
  <div class="repos-view">
    <a-space direction="vertical" :size="16" fill>
      <a-card :bordered="false">
        <template #title>
          Your repositories
        </template>
        <p class="card-description">
          Create repositories to organize uploaded documents. These are only visible to you unless
          shared explicitly.
        </p>
        <a-divider />
        <a-form
          layout="vertical"
          class="repo-form"
          :model="form"
          :disabled="creating"
          @submit.prevent="handleCreate"
        >
          <a-row :gutter="16">
            <a-col :xs="24" :sm="12">
              <a-form-item label="Repository name" field="name" :validate-status="nameError || undefined">
                <a-input v-model="form.name" placeholder="e.g. Contracts" allow-clear />
                <template v-if="nameError" #extra>
                  <a-typography-text type="danger">{{ nameErrorMessage }}</a-typography-text>
                </template>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12">
              <a-form-item label="Visibility" field="visibility">
                <a-select v-model="form.visibility">
                  <a-option value="private">Private</a-option>
                  <a-option value="shared">Shared</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="Description" field="description">
                <a-textarea
                  v-model="form.description"
                  placeholder="Optional note about this repository"
                  auto-size
                  :max-length="200"
                  show-word-limit
                />
              </a-form-item>
            </a-col>
          </a-row>
          <div class="form-actions">
            <a-button type="primary" html-type="submit" :loading="creating">Create repository</a-button>
          </div>
        </a-form>
      </a-card>

      <a-card :bordered="false">
        <template #title>
          Repository list
        </template>
        <a-table
          row-key="id"
          :data="repos"
          :loading="loading"
          :pagination="pagination"
          :columns="columns"
          @row-click="goToRepo"
          class="repo-table"
        >
          <template #visibility="{ record }">
            <a-tag :color="record.visibility === 'shared' ? 'arcoblue' : 'gray'">{{ record.visibility }}</a-tag>
          </template>
          <template #createdAt="{ record }">
            {{ formatDate(record.createdAt) }}
          </template>
          <template #actions="{ record }">
            <a-button type="text" size="mini" @click.stop="goToRepo(record)">Open</a-button>
          </template>
        </a-table>
      </a-card>
    </a-space>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { isAxiosError } from 'axios';
import { Message } from '@arco-design/web-vue';
import http from '@/api/http';

interface RepoItem {
  id: string;
  owner: string;
  name: string;
  description?: string;
  visibility: 'private' | 'shared';
  createdAt: string;
  updatedAt: string;
}

interface RepoResponse {
  data: RepoItem[];
}

const router = useRouter();

const repos = ref<RepoItem[]>([]);
const loading = ref(false);
const creating = ref(false);
const nameError = ref<'error' | ''>('');
const nameErrorMessage = ref('');
const form = reactive({
  name: '',
  description: '',
  visibility: 'private' as 'private' | 'shared',
});

const pagination = computed(() => ({
  pageSize: 8,
  simple: true,
}));

const columns = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Description', dataIndex: 'description' },
  { title: 'Visibility', slotName: 'visibility', width: 140 },
  { title: 'Created', slotName: 'createdAt', width: 200 },
  { title: 'Actions', slotName: 'actions', width: 120 },
];

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const fetchRepos = async () => {
  loading.value = true;
  try {
    const { data } = await http.get<RepoResponse>('/repos');
    repos.value = data.data ?? [];
  } catch (error) {
    if (isAxiosError(error)) {
      Message.error(error.response?.data?.error?.message ?? 'Failed to load repositories');
    } else {
      Message.error('Unexpected error while loading repositories');
    }
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  form.name = '';
  form.description = '';
  form.visibility = 'private';
  nameError.value = '';
  nameErrorMessage.value = '';
};

const handleCreate = async () => {
  const trimmed = form.name.trim();
  if (!trimmed) {
    nameError.value = 'error';
    nameErrorMessage.value = 'Repository name is required';
    return;
  }

  nameError.value = '';
  nameErrorMessage.value = '';
  creating.value = true;

  try {
    const payload = {
      name: trimmed,
      description: form.description.trim() || undefined,
      visibility: form.visibility,
    };
    const { data } = await http.post('/repos', payload);
    const created = data?.data as RepoItem | undefined;
    if (created) {
      repos.value = [created, ...repos.value];
    }
    Message.success({ content: `Repository "${trimmed}" created`, duration: 2000 });
    resetForm();
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message ?? error.message;
      if (status === 409) {
        nameError.value = 'error';
        nameErrorMessage.value = 'A repository with this name already exists.';
      }
      Message.error(message || 'Failed to create repository');
    } else {
      Message.error('Unexpected error while creating repository');
    }
  } finally {
    creating.value = false;
  }
};

const goToRepo = (record: RepoItem) => {
  router.push({ name: 'repo-detail', params: { id: record.id } });
};

onMounted(fetchRepos);
</script>

<style scoped>
.repos-view {
  padding: 0.5rem 0 2rem;
}

.card-description {
  margin: 0;
  color: var(--color-text-3);
}

.repo-form {
  margin-top: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.repo-table :deep(.arco-table-tr) {
  cursor: pointer;
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
