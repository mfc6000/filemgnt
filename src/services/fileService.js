const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { getDb } = require('../lib/db');
const {
  uploadToDify,
  refreshDifyDocument,
  isDifyConfigured,
  deleteDifyDocument,
} = require('./difyService');

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
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
  let difySyncError = null;

  if (isDifyConfigured()) {
    difySyncStatus = 'pending';
    try {
      difyDocId = await uploadToDify(file.path, file.originalname);
      difySyncStatus = 'succeeded';
    } catch (error) {
      difySyncStatus = 'failed';
      difySyncError = error.message || 'Failed to sync with Dify.';
      console.error('Dify upload failed:', error);
    }
  }

  const metadata = {
    ...baseMetadata,
    ...(difyDocId ? { difyDocId } : {}),
    difySyncStatus,
    ...(difySyncError ? { difySyncError } : {}),
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


async function deleteFile(repo, fileId) {
  if (!repo) {
    throw createError(400, 'REPO_REQUIRED', 'Repository context is required to delete files.');
  }

  if (!fileId) {
    throw createError(400, 'FILE_ID_REQUIRED', 'File identifier is required.');
  }

  const db = await getDb();
  const file = db.data.files.find((item) => item.id === fileId);

  if (!file || file.repoId !== repo.id) {
    throw createError(404, 'FILE_NOT_FOUND', 'File not found in this repository.');
  }

  const absolutePath = path.isAbsolute(file.storagePath)
    ? file.storagePath
    : path.join(process.cwd(), file.storagePath);

  try {
    await fs.promises.unlink(absolutePath);
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn('Failed to remove file from disk:', error.message);
    }
  }

  db.data.files = db.data.files.filter((item) => item.id !== fileId);
  await db.write();

  if (file.difyDocId && isDifyConfigured()) {
    try {
      await deleteDifyDocument(file.difyDocId);
    } catch (error) {
      console.warn('Failed to remove Dify document:', error.message);
    }
  }

  return file;
}

module.exports = {
  listFiles,
  uploadFile,
  listAllFilesForAdmin,
  deleteFile,
};
