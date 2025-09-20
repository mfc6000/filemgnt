const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { randomUUID } = require('crypto');
const { listFiles, uploadFile, deleteFile } = require('../services/fileService');
const { getRepoForUser } = require('../services/repoService');

const router = express.Router();

const uploadDirectory = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const configuredMax = Number(process.env.UPLOAD_MAX_BYTES);
const maxUploadBytes = Number.isFinite(configuredMax) && configuredMax > 0
  ? configuredMax
  : 10 * 1024 * 1024;

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxUploadBytes },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(createError(400, 'UNSUPPORTED_FILE_TYPE', 'Provided file type is not allowed.'));
      return;
    }

    cb(null, true);
  },
});

async function ensureRepoAccess(req, _res, next) {
  try {
    const repo = await getRepoForUser(req.user, req.params.repoId);
    req.repo = repo;
    next();
  } catch (error) {
    next(error);
  }
}

function parseShareFlag(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }

  return false;
}

router.get('/:repoId/files', ensureRepoAccess, async (req, res, next) => {
  try {
    const files = await listFiles(req.repo.id);
    res.json({ data: files });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:repoId/files',
  ensureRepoAccess,
  (req, res, next) => {
    upload.single('file')(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        next(
          createError(
            413,
            'FILE_TOO_LARGE',
            `File exceeds the maximum allowed size of ${maxUploadBytes} bytes.`
          )
        );
        return;
      }

      next(error);
    });
  },
  async (req, res, next) => {
    if (!req.file) {
      next(createError(400, 'FILE_REQUIRED', 'A file must be uploaded using the "file" field.'));
      return;
    }

    try {
      const share = parseShareFlag(req.body?.share);
      const metadata = await uploadFile(req.repo, req.user, req.file, { share });
      res.status(201).json({ data: metadata });
    } catch (error) {
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }
      next(error);
    }
  }
);

router.delete('/:repoId/files/:fileId', ensureRepoAccess, async (req, res, next) => {
  try {
    const removed = await deleteFile(req.repo, req.params.fileId);
    res.json({ data: removed });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
