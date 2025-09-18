const express = require('express');

const router = express.Router();

router.get('/:repoId/files', (req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'List repository files is not implemented yet.',
    },
  });
});

module.exports = router;
