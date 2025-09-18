const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'List repositories is not implemented yet.',
    },
  });
});

router.post('/', (req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'List repositories is not implemented yet.',
    },
  });
});

module.exports = router;
