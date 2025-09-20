const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'List users is not implemented yet.',
    },
  });
});

router.post('/', (req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Create user is not implemented yet.',
    },
  });
});

router.put('/:id', (req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Update user is not implemented yet.',
    },
  });
});

router.delete('/:id', (req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Delete user is not implemented yet.',
    },
  });
});

module.exports = router;
