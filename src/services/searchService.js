const { getDb } = require('../lib/db');
const { searchKnowledgeBase, isDifyConfigured } = require('./difyService');

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function parsePage(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePageSize(value, fallback = 10) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(50, parsed);
}

function normalizeDifyItems(payload) {
  const rawItems = payload?.data || payload?.items || [];
  const total = typeof payload?.total === 'number' ? payload.total : rawItems.length;

  const items = rawItems.map(item => {
    const metadata = item.metadata || item.document_metadata || {};
    const document = item.document || {};
    const chunk = item.chunk || {};

    return {
      documentId: item.document_id || item.documentId || item.id || null,
      fileId: metadata.fileId || metadata.file_id || null,
      repoId: metadata.repoId || metadata.repo_id || null,
      title:
        item.title ||
        document.title ||
        metadata.title ||
        item.document_name ||
        chunk.document_name ||
        'Untitled document',
      snippet: item.content || item.snippet || chunk.text || null,
      score:
        typeof item.score === 'number'
          ? item.score
          : typeof item.similarity === 'number'
            ? item.similarity
            : null,
    };
  });

  return { items, total };
}

async function performLocalSearch(user, query, options) {
  const db = await getDb();
  const normalizedQuery = query.toLowerCase();
  const page = parsePage(options.page);
  const pageSize = parsePageSize(options.pageSize);
  const startIndex = (page - 1) * pageSize;

  const repoIndex = new Map(db.data.repos.map(repo => [repo.id, repo]));

  const filtered = db.data.files.filter(file => {
    if (!file?.name) return false;

    if (options.repoId && file.repoId !== options.repoId) {
      return false;
    }

    if (options.share !== undefined && Boolean(file.share) !== options.share) {
      return false;
    }

    if (!file.name.toLowerCase().includes(normalizedQuery)) {
      return false;
    }

    if (user.role === 'admin') {
      return true;
    }

    const repo = repoIndex.get(file.repoId);

    const ownsRepo = repo?.owner === user.username;
    if (ownsRepo) {
      return true;
    }

    return Boolean(file.share);
  });

  const total = filtered.length;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  const items = paginated.map(file => ({
    documentId: file.difyDocId || null,
    fileId: file.id,
    repoId: file.repoId,
    title: file.name,
    snippet: null,
    score: null,
  }));

  return {
    source: 'local',
    items,
    total,
    page,
    pageSize,
  };
}

async function performDifySearch(query, options) {
  const payload = await searchKnowledgeBase(query, {
    page: options.page,
    pageSize: options.pageSize,
    filters: options.filters,
  });

  const page = parsePage(options.page);
  const pageSize = parsePageSize(options.pageSize);

  const normalized = normalizeDifyItems(payload);

  return {
    source: 'dify',
    items: normalized.items,
    total: typeof payload.total === 'number' ? payload.total : normalized.total,
    page,
    pageSize,
  };
}

async function search(user, query, options = {}) {
  if (!user || !user.username) {
    throw createError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  if (!query || !query.trim()) {
    throw createError(400, 'SEARCH_QUERY_REQUIRED', 'Search query is required.');
  }

  const safeQuery = query.trim();
  const filters = {};

  if (options.repoId) {
    filters.repo_id = options.repoId;
  }

  if (options.share !== undefined) {
    filters.share = options.share;
  }

  if (isDifyConfigured()) {
    try {
      return await performDifySearch(safeQuery, {
        page: options.page,
        pageSize: options.pageSize,
        filters: Object.keys(filters).length ? filters : undefined,
      });
    } catch (error) {
      const err = error;
      err.status = err.status || 502;
      err.code = err.code || 'DIFY_SEARCH_FAILED';
      throw err;
    }
  }

  return performLocalSearch(user, safeQuery, {
    page: options.page,
    pageSize: options.pageSize,
    repoId: options.repoId,
    share: options.share,
  });
}

function buildResponse(result, query) {
  return {
    query,
    source: result.source,
    items: result.items,
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
  };
}

module.exports = {
  search,
  buildResponse,
};
