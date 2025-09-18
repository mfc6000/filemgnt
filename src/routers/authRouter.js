const express = require('express');

const router = express.Router();

router.post('/login', (req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Auth login handler is not implemented yet.',
    },
  });
});

module.exports = router;
