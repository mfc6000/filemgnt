const fs = require('fs');
const path = require('path');
const { Blob } = require('buffer');

function createDifyError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizeBaseUrl(url) {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function getDifyConfig() {
  const baseUrl = normalizeBaseUrl(process.env.DIFY_BASE_URL);
  const kbId = process.env.DIFY_KB_ID;
  const apiKey = process.env.DIFY_API_KEY;

  return {
    baseUrl,
    kbId,
    apiKey,
    isConfigured: Boolean(baseUrl && kbId && apiKey),
  };
}

function ensureConfigured() {
  const config = getDifyConfig();

  if (!config.isConfigured) {
    throw createDifyError(
      500,
      'DIFY_NOT_CONFIGURED',
      'Missing Dify configuration. Ensure DIFY_BASE_URL, DIFY_KB_ID, and DIFY_API_KEY are set.'
    );
  }

  return config;
}

async function uploadToDify(filePath, fileName) {
  const { baseUrl, kbId, apiKey } = ensureConfigured();
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  await fs.promises.access(absolutePath, fs.constants.R_OK);
  const buffer = await fs.promises.readFile(absolutePath);
  const blob = new Blob([buffer]);
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('indexing_technique', 'high_quality');
  formData.append('process_rule', JSON.stringify({ mode: 'automatic' }));

  const response = await fetch(`${baseUrl}/v1/datasets/${kbId}/document/create-by-file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw createDifyError(
      response.status,
      'DIFY_UPLOAD_FAILED',
      `Dify upload failed (${response.status}): ${text}`
    );
  }

  const payload = await response.json();
  const candidates = [
    payload?.data?.id,
    payload?.data?.document_id,
    payload?.document_id,
    payload?.documentId,
    payload?.id,
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

async function refreshDifyDocument(documentId) {
  if (!documentId) {
    return false;
  }

  const { baseUrl, kbId, apiKey } = ensureConfigured();

  const response = await fetch(
    `${baseUrl}/v1/datasets/${kbId}/documents/${documentId}/indexing-status`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    const text = await response.text();
    throw createDifyError(
      response.status,
      'DIFY_REFRESH_FAILED',
      `Dify indexing status fetch failed (${response.status}): ${text}`
    );
  }

  const payload = await response.json();
  if (payload?.status) {
    return payload.status;
  }

  return true;
}

async function deleteDifyDocument(documentId) {
  if (!documentId) {
    return false;
  }

  const { baseUrl, kbId, apiKey } = ensureConfigured();

  const response = await fetch(`${baseUrl}/v1/datasets/${kbId}/documents/${documentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    const text = await response.text();
    throw createDifyError(
      response.status,
      'DIFY_DELETE_FAILED',
      `Dify document deletion failed (${response.status}): ${text}`
    );
  }

  return true;
}

async function searchKnowledgeBase(query, options = {}) {
  const { baseUrl, kbId, apiKey } = ensureConfigured();

  const page = Math.max(1, Number.parseInt(options.page, 10) || 1);
  const pageSize = Math.max(1, Math.min(50, Number.parseInt(options.pageSize, 10) || 10));
  const body = {
    keywords: query || '',
    page,
    limit: pageSize,
  };

  if (
    options.filters &&
    typeof options.filters === 'object' &&
    Object.keys(options.filters).length > 0
  ) {
    body.metadata_filter = options.filters;
  }

  const response = await fetch(`${baseUrl}/v1/datasets/${kbId}/documents/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Dify dataset search failed (${response.status}): ${text}`);
    error.status = response.status;
    error.code = 'DIFY_SEARCH_FAILED';
    throw error;
  }

  const payload = await response.json();

  if (!query) {
    return payload;
  }

  const normalizedQuery = query.toLowerCase();
  const data = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  const filtered = data.filter(item => {
    const name =
      (typeof item?.name === 'string' && item.name) ||
      (typeof item?.document_name === 'string' && item.document_name) ||
      (typeof item?.title === 'string' && item.title) ||
      '';

    if (!name.toLowerCase().includes(normalizedQuery)) {
      return false;
    }

    if (!filters) {
      return true;
    }

    const metadata =
      (item && typeof item === 'object' && (item.metadata || item.document_metadata || {})) || {};

    return Object.entries(filters).every(([key, value]) => {
      if (metadata[key] === undefined) {
        return false;
      }

      if (Array.isArray(value)) {
        return value.includes(metadata[key]);
      }

      return metadata[key] === value;
    });
  });

  if (filtered.length === data.length) {
    return payload;
  }

  return {
    ...payload,
    data: filtered,
    total:
      typeof payload?.total === 'number'
        ? Math.min(payload.total, filtered.length)
        : filtered.length,
  };
}

function isDifyConfigured() {
  return getDifyConfig().isConfigured;
}

module.exports = {
  uploadToDify,
  refreshDifyDocument,
  searchKnowledgeBase,
  isDifyConfigured,
  deleteDifyDocument,
};
