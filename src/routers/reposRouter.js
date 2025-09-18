const express = require('express');
const { listRepos, createRepo } = require('../services/repoService');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const repos = await listRepos(req.user);
    res.json({ data: repos });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const repo = await createRepo(req.user, req.body);
    res.status(201).json({ data: repo });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
