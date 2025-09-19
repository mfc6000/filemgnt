function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Unexpected server error';

  res.status(status).json({
    error: {
      code,
      message,
    },
  });
}

module.exports = { errorHandler };
