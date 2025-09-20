const fs = require('fs');
const path = require('path');

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
    throw new Error('Missing Dify configuration. Ensure DIFY_BASE_URL, DIFY_KB_ID, and DIFY_API_KEY are set.');
  }

  return config;
}

async function uploadToDify(filePath, fileName) {
  const { baseUrl, kbId, apiKey } = ensureConfigured();

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  await fs.promises.access(absolutePath, fs.constants.R_OK);

  const fileStream = fs.createReadStream(absolutePath);
  const formData = new FormData();
  formData.append('file', fileStream, fileName);

  const response = await fetch(`${baseUrl}/v1/knowledge-bases/${kbId}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Dify upload failed (${response.status}): ${text}`);
    error.status = response.status;
    error.code = 'DIFY_UPLOAD_FAILED';
    throw error;
  }

  const payload = await response.json();
  if (payload?.data?.id) {
    return payload.data.id;
  }

  if (payload?.id) {
    return payload.id;
  }

  return null;
}

async function refreshDifyDocument(documentId) {
  if (!documentId) {
    return false;
  }

  const { baseUrl, kbId, apiKey } = ensureConfigured();

  const endpoints = [
    `${baseUrl}/v1/knowledge-bases/${kbId}/documents/${documentId}/refresh`,
    `${baseUrl}/v1/knowledge-bases/${kbId}/documents/${documentId}/sync`,
    `${baseUrl}/v1/knowledge-bases/${kbId}/documents/${documentId}/index`,
  ];

  let lastError = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        return true;
      }

      if (response.status === 404) {
        continue;
      }

      const text = await response.text();
      lastError = new Error(`Dify document refresh failed (${response.status}): ${text}`);
      lastError.status = response.status;
      lastError.code = 'DIFY_REFRESH_FAILED';
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return false;
}

async function searchKnowledgeBase(query, options = {}) {
  const { baseUrl, kbId, apiKey } = ensureConfigured();

  const page = Math.max(1, Number.parseInt(options.page, 10) || 1);
  const pageSize = Math.max(1, Math.min(50, Number.parseInt(options.pageSize, 10) || 10));
  const offset = (page - 1) * pageSize;

  const body = {
    query,
    top_n: pageSize,
    offset,
  };

  if (options.filters && Object.keys(options.filters).length > 0) {
    body.filter = options.filters;
  }

  const response = await fetch(`${baseUrl}/v1/knowledge-bases/${kbId}/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Dify search failed (${response.status}): ${text}`);
    error.status = response.status;
    error.code = 'DIFY_SEARCH_FAILED';
    throw error;
  }

  return response.json();
}

function isDifyConfigured() {
  return getDifyConfig().isConfigured;
}

module.exports = {
  uploadToDify,
  refreshDifyDocument,
  searchKnowledgeBase,
  isDifyConfigured,
};
