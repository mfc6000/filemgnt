const fs = require('fs');
const path = require('path');
const { Blob } = require('buffer');

function createDifyError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function logDifyError(context, details) {
  try {
    const meta = typeof details === 'object' ? details : { details };
    console.error(`[Dify] ${context}`, meta);
  } catch (loggingError) {
    console.error(`[Dify] ${context} (failed to log details)`, loggingError);
  }
}

function normalizeBaseUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function getDifyConfig() {
  const rawBaseUrl = process.env.DIFY_BASE_URL;
  const normalizedBaseUrl = normalizeBaseUrl(rawBaseUrl);
  const apiBaseUrl = normalizedBaseUrl
    ? normalizedBaseUrl.endsWith('/v1')
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/v1`
    : '';
  const kbId = process.env.DIFY_KB_ID || process.env.DIFY_DATASET_ID;
  const apiKey = process.env.DIFY_API_KEY;

  return {
    baseUrl: normalizedBaseUrl,
    apiBaseUrl: normalizeBaseUrl(apiBaseUrl),
    kbId,
    apiKey,
    isConfigured: Boolean(apiBaseUrl && kbId && apiKey),
  };
}

function ensureConfigured() {
  const config = getDifyConfig();

  if (!config.isConfigured) {
    logDifyError('Missing configuration', {
      baseUrl: config.baseUrl || null,
      apiBaseUrl: config.apiBaseUrl || null,
      kbId: config.kbId || null,
      hasApiKey: Boolean(config.apiKey),
    });
    throw createDifyError(
      500,
      'DIFY_NOT_CONFIGURED',
      'Missing Dify configuration. Ensure DIFY_BASE_URL, DIFY_KB_ID, and DIFY_API_KEY are set.'
    );
  }

  return config;
}

async function uploadToDify(filePath, fileName) {
  const { apiBaseUrl, kbId, apiKey } = ensureConfigured();
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  await fs.promises.access(absolutePath, fs.constants.R_OK);
  const buffer = await fs.promises.readFile(absolutePath);
  const blob = new Blob([buffer]);
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('indexing_technique', 'high_quality');
  formData.append('process_rule', JSON.stringify({ mode: 'automatic' }));

  const response = await fetch(`${apiBaseUrl}/datasets/${kbId}/document/create-by-file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    logDifyError('Upload failed', {
      status: response.status,
      url: `${apiBaseUrl}/datasets/${kbId}/document/create-by-file`,
      body: text,
    });
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

  const { apiBaseUrl, kbId, apiKey } = ensureConfigured();
  const response = await fetch(
    `${apiBaseUrl}/datasets/${kbId}/documents/${documentId}/indexing-status`,
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
    logDifyError('Indexing status fetch failed', {
      status: response.status,
      url: `${apiBaseUrl}/datasets/${kbId}/documents/${documentId}/indexing-status`,
      body: text,
    });

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

  const { apiBaseUrl, kbId, apiKey } = ensureConfigured();

  const response = await fetch(`${apiBaseUrl}/datasets/${kbId}/documents/${documentId}`, {
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
    logDifyError('Document deletion failed', {
      status: response.status,
      url: `${apiBaseUrl}/datasets/${kbId}/documents/${documentId}`,
      body: text,
    });
    throw createDifyError(
      response.status,
      'DIFY_DELETE_FAILED',
      `Dify document deletion failed (${response.status}): ${text}`
    );
  }

  return true;
}

async function retrieveChunks(options = {}) {
  const {
    baseUrl,
    apiKey,
    datasetId,
    query,
    retrievalModel,
    timeoutMs = 15000,
  } = options;

  if (!baseUrl) {
    logDifyError('Retrieve called without baseUrl', { datasetId, query });
    throw createDifyError(500, 'DIFY_BASE_URL_MISSING', 'Dify baseUrl is required.');
  }

  if (!apiKey) {
    logDifyError('Retrieve called without apiKey', { datasetId, query });
    throw createDifyError(500, 'DIFY_API_KEY_MISSING', 'Dify API key is required.');
  }

  if (!datasetId) {
    logDifyError('Retrieve called without datasetId', { baseUrl, query });
    throw createDifyError(500, 'DIFY_DATASET_ID_MISSING', 'Dify dataset id is required.');
  }

  if (!query || !query.trim()) {
    logDifyError('Retrieve called without query', { baseUrl, datasetId });
    throw createDifyError(400, 'DIFY_QUERY_REQUIRED', 'Query is required for chunk retrieval.');
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const url = `${normalizedBaseUrl}/datasets/${datasetId}/retrieve`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const body = { query: query.trim() };
  
  if (retrievalModel && typeof retrievalModel === 'object' && Object.keys(retrievalModel).length > 0) {

    body.retrieval_model = retrievalModel;
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Dify retrieve request timed out after ${timeoutMs} ms`);
      timeoutError.code = 'DIFY_RETRIEVE_TIMEOUT';
      timeoutError.timeout = timeoutMs;
      timeoutError.url = url;

      logDifyError('Retrieve request timed out', {
        timeoutMs,
        url,
      });
      throw timeoutError;
    }

    logDifyError('Retrieve request failed before response', {
      url,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
    });

    error.url = url;
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const rawBody = await response.text();
    let parsedBody;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null;
    } catch (error) {
      parsedBody = rawBody;
    }

    logDifyError('Retrieve request failed with response', {
      status: response.status,
      url,
      body: parsedBody,
    });

    const requestError = new Error(`Dify retrieve request failed with status ${response.status}`);
    requestError.status = response.status;
    requestError.body = parsedBody;
    requestError.url = url;
    throw requestError;
  }

  const payload = await response.json();
  const records = Array.isArray(payload?.records) ? payload.records : [];

  return records
    .map(record => {
      const segment = record?.segment || {};
      const content = segment?.content;
      const normalizedContent = typeof content === 'string' ? content : '';

      return {
        segmentId: segment?.id || null,
        documentId: segment?.document_id || segment?.document?.id || null,
        content: normalizedContent,
        score: typeof record?.score === 'number' ? record.score : 0,
      };
    })
    .filter(item => item.segmentId && item.documentId);
}

async function searchKnowledgeBase(query, options = {}) {
  const { apiBaseUrl, kbId, apiKey } = ensureConfigured();

  const page = Math.max(1, Number.parseInt(options.page, 10) || 1);
  const pageSize = Math.max(1, Math.min(50, Number.parseInt(options.pageSize, 10) || 10));
  const retrievalModel = {};

  if (options.retrievalModel && typeof options.retrievalModel === 'object') {
    Object.assign(retrievalModel, options.retrievalModel);
  }

  if (options.filters && typeof options.filters === 'object' && Object.keys(options.filters).length > 0) {
    retrievalModel.metadata_filter = options.filters;
  }

  if (retrievalModel.score_threshold_enabled === undefined) {
    retrievalModel.score_threshold_enabled = true;
  }

  if (
    retrievalModel.score_threshold === undefined ||
    retrievalModel.score_threshold === null ||
    Number.isNaN(Number(retrievalModel.score_threshold)) ||
    Number(retrievalModel.score_threshold) < 0.2
  ) {
    retrievalModel.score_threshold = 0.2;
  } else {
    retrievalModel.score_threshold = Number(retrievalModel.score_threshold);
  }

  if (retrievalModel.top_k === undefined) {
    const desired = Math.max(page * pageSize, pageSize * 2);
    retrievalModel.top_k = Math.min(200, desired);
  }

  const records = await retrieveChunks({
    baseUrl: apiBaseUrl,
    apiKey,
    datasetId: kbId,
    query,
    retrievalModel: Object.keys(retrievalModel).length > 0 ? retrievalModel : undefined,
    timeoutMs: options.timeoutMs,
  });

  return {
    records,
    page,
    pageSize,
  };
}

function isDifyConfigured() {
  return getDifyConfig().isConfigured;
}

module.exports = {
  uploadToDify,
  refreshDifyDocument,
  retrieveChunks,
  searchKnowledgeBase,
  isDifyConfigured,
  deleteDifyDocument,
};
