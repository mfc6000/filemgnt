<template>
  <div class="repo-detail">
    <a-space direction="vertical" :size="16" fill>
      <a-card :bordered="false">
        <template #title>
          {{ repo?.name || t('repoDetail.fallbackName') }}
        </template>
        <template #extra>
          <a-button type="text" @click="goBack">{{ t('repoDetail.back') }}</a-button>
        </template>
        <p class="description" v-if="repo?.description">{{ repo.description }}</p>
        <div class="meta" v-if="repo">
          <a-tag :color="repo.visibility === 'shared' ? 'arcoblue' : 'gray'">
            {{ t(`common.visibility.${repo.visibility}`) }}
          </a-tag>
          <span>{{ t('repoDetail.meta.created', { date: formatDate(repo.createdAt) }) }}</span>
          <span>{{ t('repoDetail.meta.updated', { date: formatDate(repo.updatedAt) }) }}</span>
        </div>
      </a-card>

      <a-card :bordered="false">
        <template #title>
          {{ t('repoDetail.uploadTitle') }}
        </template>
        <a-form class="upload-form" layout="vertical">
          <a-row :gutter="16">
            <a-col :xs="24" :sm="14">
              <input ref="fileInput" type="file" class="file-input" @change="onFileChange" />
            </a-col>
            <a-col :xs="12" :sm="5">
              <a-form-item :label="t('repoDetail.shareLabel')">
               <a-switch v-model="share" size="small" />
              </a-form-item>
            </a-col>
            <a-col :xs="12" :sm="5">
              <div class="upload-actions">
                <a-button type="primary" :loading="uploading" @click="handleUpload">
                  {{ t('repoDetail.uploadButton') }}
                </a-button>
                <a-button type="text" :disabled="uploading" @click="resetForm">{{ t('repoDetail.resetButton') }}</a-button>
              </div>
            </a-col>
          </a-row>
        </a-form>
        <a-progress v-if="uploading" :percent="uploadProgress" status="active" />
      </a-card>

      <a-card :bordered="false">
        <template #title>
          {{ t('repoDetail.filesTitle') }}
        </template>
        <a-table
          row-key="id"
          :data="files"
          :loading="filesLoading"
          :pagination="filesPagination"
          :columns="columns"
          class="files-table"
        >
          <template #name="{ record }">
              <div class="file-name">
                <IconFile class="file-icon" />
                <span>{{ record.name }}</span>
              </div>
          </template>
          <template #size="{ record }">
            {{ formatSize(record.size) }}
          </template>
          <template #share="{ record }">
            <a-tag :color="record.share ? 'arcoblue' : 'gray'">
              {{ t(`repoDetail.shareTag.${record.share ? 'true' : 'false'}`) }}
            </a-tag>
          </template>
          <template #createdAt="{ record }">
            {{ formatDate(record.createdAt) }}
          </template>
        </a-table>
      </a-card>
    </a-space>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { isAxiosError } from 'axios';
import { Message } from '@arco-design/web-vue';
import { IconFile } from '@arco-design/web-vue/es/icon';
import { useI18n } from 'vue-i18n';
import http from '@/api/http';

interface RepoItem {
  id: string;
  name: string;
  description?: string;
  visibility: 'private' | 'shared';
  createdAt: string;
  updatedAt: string;
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  mime: string;
  share: boolean;
  createdAt: string;
  storagePath: string;
  difyDocId?: string;
  difySyncStatus?: 'pending' | 'succeeded' | 'skipped';
}

interface FilesResponse {
  data: FileItem[];
}

interface RepoListResponse {
  data: RepoItem[];
}

type ApiErrorDetails = {
  reason?: string;
  limit?: number;
  [key: string]: unknown;
};

interface ApiErrorPayload {
  code?: string;
  message?: string;
  details?: ApiErrorDetails;
}

const repoDetailErrorMessages: Record<string, string> = {
  FILE_REQUIRED: 'repoDetail.errors.FILE_REQUIRED',
  FILE_TOO_LARGE: 'repoDetail.errors.FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'repoDetail.errors.UNSUPPORTED_FILE_TYPE',
  UNAUTHORIZED: 'repoDetail.errors.UNAUTHORIZED',
  INTERNAL_ERROR: 'repoDetail.errors.INTERNAL_ERROR',
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const repoId = computed(() => route.params.id as string);

const repo = ref<RepoItem | null>(null);
const files = ref<FileItem[]>([]);
const filesLoading = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const share = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);

const filesPagination = computed(() => ({
  pageSize: 10,
  simple: true,
}));

const columns = computed(() => [
  { title: t('repoDetail.columns.name'), slotName: 'name' },
  { title: t('repoDetail.columns.size'), slotName: 'size', width: 140 },
  { title: t('repoDetail.columns.share'), slotName: 'share', width: 120 },
  { title: t('repoDetail.columns.created'), slotName: 'createdAt', width: 200 },
]);

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatSize = (size: number) => {
  if (!Number.isFinite(size)) {
    return '—';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const resolveErrorMessage = (error: unknown, fallbackKey: string) => {
  if (!isAxiosError(error)) {
    return t(fallbackKey);
  }

  const payload = error.response?.data?.error as ApiErrorPayload | undefined;
  if (!payload) {
    return t(fallbackKey);
  }

  const code = payload.code;
  const details = payload.details ?? {};
  const reason =
    typeof details.reason === 'string' && details.reason.trim().length > 0
      ? details.reason.trim()
      : undefined;
  const limitValue =
    typeof details.limit === 'number' && Number.isFinite(details.limit)
      ? details.limit
      : undefined;

  if (code === 'DIFY_SYNC_FAILED') {
    if (reason) {
      return t('repoDetail.errors.DIFY_SYNC_FAILED_WITH_REASON', { reason });
    }
    return t('repoDetail.errors.DIFY_SYNC_FAILED');
  }

  if (code === 'FILE_TOO_LARGE') {
    if (typeof limitValue === 'number') {
      return t('repoDetail.errors.FILE_TOO_LARGE_WITH_LIMIT', { limit: formatSize(limitValue) });
    }
    return t('repoDetail.errors.FILE_TOO_LARGE');
  }

  if (code && repoDetailErrorMessages[code]) {
    return t(repoDetailErrorMessages[code]);
  }

  if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return payload.message;
  }

  return t(fallbackKey);
};

const goBack = () => {
  router.push({ name: 'repos' });
};

const ensureRepoLoaded = async () => {
  if (!repoId.value) {
    Message.error(t('repoDetail.messages.invalidRepo'));
    goBack();
    return;
  }

  try {
    const { data } = await http.get<RepoListResponse>('/repos');
    const found = data.data?.find((item) => item.id === repoId.value);
    if (!found) {
      Message.error(t('repoDetail.messages.notFound'));
      goBack();
      return;
    }
    repo.value = found;
  } catch (error) {
    Message.error(resolveErrorMessage(error, 'repoDetail.messages.loadRepoFailed'));
    goBack();
    return;
  }
};

const loadFiles = async () => {
  if (!repoId.value) {
    return;
  }
  filesLoading.value = true;
  try {
    const { data } = await http.get<FilesResponse>(`/repos/${repoId.value}/files`);
    files.value = data.data ?? [];
  } catch (error) {
    Message.error(resolveErrorMessage(error, 'repoDetail.messages.loadFilesFailed'));
  } finally {
    filesLoading.value = false;
  }
};

const resetForm = () => {
  share.value = false;
  selectedFile.value = null;
  uploadProgress.value = 0;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  selectedFile.value = input.files?.[0] ?? null;
  uploadProgress.value = 0;
};

const handleUpload = async () => {
  if (!repoId.value) {
    Message.error(t('repoDetail.messages.missingRepo'));
    return;
  }

  if (!selectedFile.value) {
    Message.warning(t('repoDetail.messages.selectFile'));
    return;
  }

  const formData = new FormData();
  formData.append('file', selectedFile.value);
  formData.append('share', String(share.value));

  uploading.value = true;
  uploadProgress.value = 0;

  try {
    const { data } = await http.post(`/repos/${repoId.value}/files`, formData, {
      onUploadProgress: (event) => {
        if (!event.total) {
          return;
        }
        uploadProgress.value = Math.round((event.loaded / event.total) * 100);
      },
    });

    const created = data?.data as FileItem | undefined;
    if (created) {
      files.value = [created, ...files.value];
    }
    Message.success({ content: t('repoDetail.messages.success'), duration: 2000 });
    await loadFiles();
    resetForm();
  } catch (error) {
    Message.error(resolveErrorMessage(error, 'repoDetail.messages.uploadFailed'));
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
  }
};

onMounted(async () => {
  await ensureRepoLoaded();
  await loadFiles();
});
</script>

<style scoped>
.repo-detail {
  padding: 0.5rem 0 2rem;
}

.description {
  margin: 0;
  color: var(--color-text-3);
}

.meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: var(--color-text-3);
}

.upload-form {
  margin-bottom: 1rem;
}

.file-input {
  width: 100%;
}

.upload-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-end;
}

.file-name {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.file-icon {
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .upload-actions {
    justify-content: flex-start;
  }

  .upload-actions .arco-btn {
    flex: 1;
  }
}
</style>
