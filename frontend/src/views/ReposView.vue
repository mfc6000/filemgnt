<template>
  <div class="repos-view">
    <a-space direction="vertical" :size="16" fill>
      <a-card :bordered="false">
        <template #title>
          {{ t('repos.title') }}
        </template>
        <p class="card-description">
          {{ t('repos.description') }}
        </p>
        <a-divider />
        <a-form
          layout="vertical"
          class="repo-form"
          :model="form"
          :disabled="creating"
        >
          <a-row :gutter="16">
            <a-col :xs="24" :sm="12">
              <a-form-item :label="t('repos.form.nameLabel')" field="name" :validate-status="nameError || undefined">
                <a-input
                  v-model="form.name"
                  :placeholder="t('repos.form.namePlaceholder')"
                  allow-clear
                  @press-enter="handleCreate"
                />
                <template v-if="nameError" #extra>
                  <a-typography-text type="danger">{{ nameErrorMessage }}</a-typography-text>
                </template>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12">
              <a-form-item :label="t('repos.form.visibilityLabel')" field="visibility">
                <a-select v-model="form.visibility">
                  <a-option value="private">{{ t('common.visibility.private') }}</a-option>
                  <a-option value="shared">{{ t('common.visibility.shared') }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item :label="t('repos.form.descriptionLabel')" field="description">
                <a-textarea
                  v-model="form.description"
                  :placeholder="t('repos.form.descriptionPlaceholder')"
                  auto-size
                  :max-length="200"
                  show-word-limit
                />
              </a-form-item>
            </a-col>
          </a-row>
          <div class="form-actions">
            <a-button type="primary" :loading="creating" @click="handleCreate">
              {{ t('repos.form.submit') }}
            </a-button>
          </div>
        </a-form>
      </a-card>

      <a-card :bordered="false">
        <template #title>
          {{ t('repos.table.title') }}
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
            <a-tag :color="record.visibility === 'shared' ? 'arcoblue' : 'gray'">
              {{ t(`common.visibility.${record.visibility}`) }}
            </a-tag>
          </template>
          <template #createdAt="{ record }">
            {{ formatDate(record.createdAt) }}
          </template>
          <template #actions="{ record }">
            <a-button type="text" size="mini" @click.stop="goToRepo(record)">{{ t('repos.table.open') }}</a-button>
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
import { useI18n } from 'vue-i18n';

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
const { t } = useI18n();

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

const columns = computed(() => [
  { title: t('repos.table.columns.name'), dataIndex: 'name' },
  { title: t('repos.table.columns.description'), dataIndex: 'description' },
  { title: t('repos.table.columns.visibility'), slotName: 'visibility', width: 140 },
  { title: t('repos.table.columns.created'), slotName: 'createdAt', width: 200 },
  { title: t('repos.table.columns.actions'), slotName: 'actions', width: 120 },
]);

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
      Message.error(error.response?.data?.error?.message ?? t('repos.messages.loadFailed'));
    } else {
      Message.error(t('repos.messages.loadUnexpected'));
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
    nameErrorMessage.value = t('repos.form.validation.required');
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
    Message.success({ content: t('repos.messages.createSuccess', { name: trimmed }), duration: 2000 });
    resetForm();
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message ?? error.message;
      if (status === 409) {
        nameError.value = 'error';
        nameErrorMessage.value = t('repos.form.validation.duplicate');
      }
      Message.error(message || t('repos.messages.createFailed'));
    } else {
      Message.error(t('repos.messages.createUnexpected'));
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
