const path = require('path');
const { randomUUID } = require('crypto');
const { getDb } = require('../lib/db');
const { uploadToDify, refreshDifyDocument, isDifyConfigured } = require('./difyService');

function createError(status, code, message, details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (details && typeof details === 'object') {
    error.details = details;
  }
  return error;
}

async function listFiles(repoId) {
  const db = await getDb();
  const files = db.data.files.filter((file) => file.repoId === repoId);

  return files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function uploadFile(repo, user, file, options = {}) {
  if (!repo) {
    throw createError(500, 'INTERNAL_ERROR', 'Repository context is required for uploads.');
  }

  if (!user || !user.username) {
    throw createError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  if (!file) {
    throw createError(400, 'FILE_REQUIRED', 'A file must be provided for upload.');
  }

  const db = await getDb();
  const timestamp = new Date().toISOString();
  const storagePath = path
    .relative(process.cwd(), file.path)
    .split(path.sep)
    .join('/');

  const baseMetadata = {
    id: randomUUID(),
    repoId: repo.id,
    uploaderId: user.username,
    name: file.originalname,
    size: file.size,
    mime: file.mimetype,
    share: Boolean(options.share),
    createdAt: timestamp,
    storagePath,
  };

  let difyDocId = null;
  let difySyncStatus = 'skipped';

  if (isDifyConfigured()) {
    difySyncStatus = 'pending';
    try {
      difyDocId = await uploadToDify(file.path, file.originalname);
      difySyncStatus = 'succeeded';
    } catch (error) {
      console.error('Dify upload failed:', error);
      const message = typeof error?.message === 'string' ? error.message.trim() : '';
      const causeMessage =
        typeof error?.cause?.message === 'string' ? error.cause.message.trim() : '';
      const reason = message || causeMessage;
      throw createError(
        502,
        'DIFY_SYNC_FAILED',
        'Failed to sync file with Dify.',
        reason ? { reason } : undefined
      );
    }
  }

  const metadata = {
    ...baseMetadata,
    ...(difyDocId ? { difyDocId } : {}),
    difySyncStatus,
  };

  db.data.files.push(metadata);
  await db.write();

  if (difyDocId) {
    try {
      await refreshDifyDocument(difyDocId);
    } catch (refreshError) {
      console.warn('Dify document refresh failed:', refreshError.message);
    }
  }

  return metadata;
}

function listAllFilesForAdmin(/* options */) {
  throw new Error('TODO: implement admin file listing');
}

module.exports = {
  listFiles,
  uploadFile,
  listAllFilesForAdmin,
};
