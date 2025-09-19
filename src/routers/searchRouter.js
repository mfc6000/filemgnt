const express = require('express');
const { search, buildResponse } = require('../services/searchService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { q, repoId, share, page, pageSize } = req.query;

    const shareFilter =
      typeof share === 'string'
        ? share.toLowerCase() === 'true'
          ? true
          : share.toLowerCase() === 'false'
          ? false
          : undefined
        : undefined;

    const result = await search(req.user, q, {
      repoId: typeof repoId === 'string' ? repoId : undefined,
      share: shareFilter,
      page,
      pageSize,
    });

    res.json(buildResponse(result, q?.trim() || ''));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
