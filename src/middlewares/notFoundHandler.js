function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
}

module.exports = { notFoundHandler };
