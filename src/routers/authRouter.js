const express = require('express');
const { authenticateCredentials } = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Username and password are required.',
      },
    });
  }

  const authResult = authenticateCredentials(username, password);

  if (!authResult) {
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Username or password is incorrect.',
      },
    });
  }

  return res.status(200).json(authResult);
});

module.exports = router;
