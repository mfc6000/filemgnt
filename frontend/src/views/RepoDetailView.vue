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
                <a-button type="text" :disabled="uploading" @click="resetForm">{{
                  t('repoDetail.resetButton')
                }}</a-button>
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
          <template #actions="{ record }">
            <a-button
              type="text"
              size="mini"
              status="danger"
              :loading="deletingId === record.id"
              @click.stop="confirmDelete(record)"
            >
              {{ t('repoDetail.actions.delete') }}
            </a-button>
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
import { Message, Modal } from '@arco-design/web-vue';
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
const deletingId = ref<string | null>(null);

const filesPagination = computed(() => ({
  pageSize: 10,
  simple: true,
}));

const columns = computed(() => [
  { title: t('repoDetail.columns.name'), slotName: 'name' },
  { title: t('repoDetail.columns.size'), slotName: 'size', width: 140 },
  { title: t('repoDetail.columns.share'), slotName: 'share', width: 120 },
  { title: t('repoDetail.columns.created'), slotName: 'createdAt', width: 200 },
  { title: t('repoDetail.columns.actions'), slotName: 'actions', width: 120 },
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
    const found = data.data?.find(item => item.id === repoId.value);
    if (!found) {
      Message.error(t('repoDetail.messages.notFound'));
      goBack();
      return;
    }
    repo.value = found;
  } catch (error) {
    if (isAxiosError(error)) {
      Message.error(
        error.response?.data?.error?.message ?? t('repoDetail.messages.loadRepoFailed')
      );
    } else {
      Message.error(t('repoDetail.messages.loadRepoUnexpected'));
    }
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
    if (isAxiosError(error)) {
      Message.error(
        error.response?.data?.error?.message ?? t('repoDetail.messages.loadFilesFailed')
      );
    } else {
      Message.error(t('repoDetail.messages.loadFilesUnexpected'));
    }
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
    if (created?.difySyncStatus === 'failed') {
      const reason = created.difySyncError?.trim();
      Message.warning({
        content: reason
          ? t('repoDetail.messages.difySyncFailedWithReason', { reason })
          : t('repoDetail.messages.difySyncFailed'),
        duration: 4000,
      });
    }
    await loadFiles();
    resetForm();
  } catch (error) {
    if (isAxiosError(error)) {
      Message.error(error.response?.data?.error?.message ?? t('repoDetail.messages.uploadFailed'));
    } else {
      Message.error(t('repoDetail.messages.uploadUnexpected'));
    }
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
  }
};

const performDelete = async (file: FileItem) => {
  if (!repoId.value) {
    Message.error(t('repoDetail.messages.missingRepo'));
    return;
  }

  deletingId.value = file.id;
  try {
    await http.delete(`/repos/${repoId.value}/files/${file.id}`);
    files.value = files.value.filter(item => item.id !== file.id);
    Message.success({
      content: t('repoDetail.messages.deleteSuccess', { name: file.name }),
      duration: 1500,
    });
  } catch (error) {
    if (isAxiosError(error)) {
      Message.error(error.response?.data?.error?.message ?? t('repoDetail.messages.deleteFailed'));
    } else {
      Message.error(t('repoDetail.messages.deleteUnexpected'));
    }
  } finally {
    deletingId.value = null;
  }
};

const confirmDelete = (file: FileItem) => {
  Modal.confirm({
    title: t('repoDetail.confirm.title'),
    content: t('repoDetail.confirm.message', { name: file.name }),
    okText: t('repoDetail.confirm.ok'),
    cancelText: t('repoDetail.confirm.cancel'),
    okButtonProps: { status: 'danger' },
    onOk: () => performDelete(file),
  });
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
