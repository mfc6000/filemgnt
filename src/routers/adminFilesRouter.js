const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Admin file listing is not implemented yet.',
    },
  });
});

module.exports = router;
