const express = require('express');
const cors = require('cors');
const { notFoundHandler } = require('./middlewares/notFoundHandler');
const { errorHandler } = require('./middlewares/errorHandler');
const { requestLogger } = require('./middlewares/requestLogger');
const { authMiddleware, requireAdmin } = require('./middlewares/authMiddleware');
const authRouter = require('./routers/authRouter');
const adminUsersRouter = require('./routers/adminUsersRouter');
const reposRouter = require('./routers/reposRouter');
const repoFilesRouter = require('./routers/repoFilesRouter');
const adminFilesRouter = require('./routers/adminFilesRouter');
const searchRouter = require('./routers/searchRouter');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(requestLogger);

  app.use('/api/auth', authRouter);
  app.use('/api/admin/users', authMiddleware, requireAdmin, adminUsersRouter);
  app.use('/api/admin/files', authMiddleware, requireAdmin, adminFilesRouter);
  app.use('/api/repos/router', authMiddleware, reposRouter);
  app.use('/api/repos/filesrouter', authMiddleware, repoFilesRouter);
  app.use('/api/search', searchRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
