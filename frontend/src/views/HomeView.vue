<template>
  <div class="home-view">
    <a-card class="search-card" :bordered="false">
      <div class="search-header">
        <div>
          <h2>{{ t('home.title') }}</h2>
          <p class="subtitle">
            {{ t('home.subtitle') }}
          </p>
        </div>
        <a-space class="quick-links" wrap>
          <a-button type="text" @click="goToRepos">{{ t('home.manageRepos') }}</a-button>
          <a-button v-if="isAdmin" type="text" @click="goToUsers">{{
            t('home.userManagement')
          }}</a-button>
        </a-space>
      </div>

      <a-form layout="vertical" class="search-form">
        <a-form-item field="query" hide-label :validate-status="queryError ? 'error' : 'success'">
          <a-input-search
            v-model="query"
            :loading="loading"
            :placeholder="t('home.searchPlaceholder')"
            :button-text="t('home.searchButton')"
            size="large"
            @search="handleSearch"
          />
          <template v-if="queryError" #extra>
            <a-typography-text type="danger">{{ queryError }}</a-typography-text>
          </template>
        </a-form-item>
      </a-form>

      <div class="results" v-if="hasSearched">
        <div class="results-meta">
          <span v-if="!errorMessage">
            {{ resultSummary }}
          </span>
          <a-tag v-if="errorMessage" color="red">{{ t('home.tagError') }}</a-tag>
        </div>
        <a-empty
          v-if="!loading && !errorMessage && results.length === 0"
          :description="t('home.noResults')"
        >
          <template #image>
            <IconFile class="empty-icon" />
          </template>
        </a-empty>

        <a-alert
          v-if="errorMessage"
          type="error"
          closable
          @close="errorMessage = ''"
          :show-icon="false"
          class="error-alert"
        >
          {{ errorMessage }}
        </a-alert>

        <a-spin :loading="loading" class="results-spin">
          <a-list v-if="results.length" :bordered="false" :split="false">
            <a-list-item v-for="item in results" :key="item.documentId || item.fileId">
              <div class="result-item">
                <div class="result-title">
                  <IconFile class="result-icon" />
                  <a-typography-text strong>{{
                    item.title || item.name || t('home.untitled')
                  }}</a-typography-text>
                  <a-tag v-if="item.repoId" size="small">{{
                    t('home.repoLabel', { id: item.repoId })
                  }}</a-tag>
                </div>
                <a-typography-paragraph v-if="item.snippet" class="snippet" ellipsis :rows="2">
                  {{ item.snippet }}
                </a-typography-paragraph>
                <div class="result-meta">
                  <span v-if="item.score !== undefined && item.score !== null">
                    {{ t('home.scoreLabel', { score: item.score.toFixed(2) }) }}
                  </span>
                  <span v-if="item.fileId">{{ t('home.fileId', { id: item.fileId }) }}</span>
                  <span v-if="item.documentId">{{
                    t('home.documentId', { id: item.documentId })
                  }}</span>
                </div>
              </div>
            </a-list-item>
          </a-list>
        </a-spin>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { isAxiosError } from 'axios';
import { Message } from '@arco-design/web-vue';
import { IconFile } from '@arco-design/web-vue/es/icon';
import { useI18n } from 'vue-i18n';
import http from '@/api/http';
import { useAuthStore } from '@/store';

interface SearchResultItem {
  documentId?: string | null;
  fileId?: string | null;
  repoId?: string | null;
  title?: string | null;
  name?: string | null;
  snippet?: string | null;
  score?: number | null;
}

interface SearchResponse {
  query: string;
  source?: string;
  items: SearchResultItem[];
}

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();
const isAdmin = computed(() => authStore.isAdmin);
const query = ref('');
const queryError = ref('');
const loading = ref(false);
const results = reactive<SearchResultItem[]>([]);
const hasSearched = ref(false);
const source = ref<string | null>(null);
const errorMessage = ref('');

const sourceLabel = computed(() => {
  if (!source.value) {
    return '';
  }
  const key = source.value === 'dify' ? 'home.sources.dify' : 'home.sources.local';
  return t(key);
});

const resultSummary = computed(() => {
  const base = t('home.resultsCount', { count: results.length });
  if (!source.value) {
    return base;
  }
  return `${base}${t('home.resultsFrom', { source: sourceLabel.value })}`;
});

const goToRepos = () => {
  router.push({ name: 'repos' });
};

const goToUsers = () => {
  router.push({ name: 'admin-users' });
};

const handleSearch = async () => {
  const trimmed = query.value.trim();
  if (!trimmed) {
    queryError.value = t('home.validation.required');
    return;
  }

  queryError.value = '';
  loading.value = true;
  errorMessage.value = '';
  hasSearched.value = true;

  try {
    const { data } = await http.get<SearchResponse>('/search', {
      params: { q: trimmed },
    });

    results.splice(0, results.length, ...(data.items ?? []));
    source.value = data.source ?? null;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.error?.message ?? error.message;
      errorMessage.value = message || t('home.messages.failed');
    } else {
      errorMessage.value = t('home.messages.unexpected');
    }
    results.splice(0, results.length);
  } finally {
    loading.value = false;
  }

  if (!errorMessage.value) {
    Message.success({ content: t('home.messages.success', { query: trimmed }), duration: 2000 });
  }
};
</script>

<style scoped>
.home-view {
  display: flex;
  justify-content: center;
  padding: 1.5rem 1rem 2rem;
}

.search-card {
  width: 100%;
  max-width: 960px;
  background: rgba(255, 255, 255, 0.92);
}

.search-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: var(--color-text-3);
  line-height: 1.5;
}

.quick-links {
  flex-shrink: 0;
}

.search-form {
  margin-bottom: 1rem;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.results-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--color-text-3);
}

.results-spin {
  width: 100%;
}

.result-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-title {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-text-3);
}

.snippet {
  margin-bottom: 0;
}

.error-alert {
  width: 100%;
}

@media (max-width: 768px) {
  .search-header {
    flex-direction: column;
    align-items: stretch;
  }

  .quick-links {
    justify-content: flex-start;
  }
}
</style>
.result-icon { font-size: 1.2rem; } .empty-icon { font-size: 2.5rem; }
