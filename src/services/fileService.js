const path = require('path');
const { randomUUID } = require('crypto');
const { getDb } = require('../lib/db');
const { uploadToDify } = require('./difyService');

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

  const metadata = {
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

  db.data.files.push(metadata);
  await db.write();

  const difyPayload = {
    path: file.path,
    name: file.originalname,
  };

  try {
    const difyDocId = await uploadToDify(difyPayload.path, difyPayload.name);
    if (difyDocId) {
      metadata.difyDocId = difyDocId;
      await db.write();
    }
  } catch (error) {
    console.warn('Failed to upload document to Dify:', error.message);
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
