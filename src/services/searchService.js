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

async function performDifySearch(user, query, options) {
  const db = await getDb();

  const { records, page, pageSize } = await searchKnowledgeBase(query, {
    page: options.page,
    pageSize: options.pageSize,
    filters: options.filters,
    retrievalModel: options.retrievalModel,
    timeoutMs: options.timeoutMs,
  });

  const repoIndex = new Map(db.data.repos.map(repo => [repo.id, repo]));
  const fileIndex = new Map(
    db.data.files.filter(file => file?.difyDocId).map(file => [file.difyDocId, file])
  );

  const filters = options.filters || {};
  const filteredRecords = records.filter(record => {
    if (!record?.documentId) {
      return false;
    }

    const file = fileIndex.get(record.documentId);
    if (!file) {
      return false;
    }

    if (filters.repo_id && file.repoId !== filters.repo_id) {
      return false;
    }

    if (filters.share !== undefined && Boolean(file.share) !== filters.share) {
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

  const startIndex = (page - 1) * pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + pageSize);

  const items = paginatedRecords.map(record => {
    const file = fileIndex.get(record.documentId) || {};
    return {
      documentId: record.documentId,
      fileId: file.id || null,
      repoId: file.repoId || null,
      title: file.name || `Document ${record.documentId}`,
      snippet: record.content,
      score: typeof record.score === 'number' ? record.score : null,
    };
  });

  return {
    source: 'dify',
    items,
    total: filteredRecords.length,
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
      return await performDifySearch(user, safeQuery, {
        page: options.page,
        pageSize: options.pageSize,
        filters: Object.keys(filters).length ? filters : undefined,
        retrievalModel: options.retrievalModel,
        timeoutMs: options.timeoutMs,
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
