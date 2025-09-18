const { randomUUID } = require('crypto');
const { getDb } = require('../lib/db');

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function listRepos(user) {
  if (!user || !user.username) {
    throw createError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  const db = await getDb();
  const repos = db.data.repos.filter((repo) => repo.owner === user.username);

  return repos;
}

async function createRepo(user, payload) {
  if (!user || !user.username) {
    throw createError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  if (!payload || typeof payload !== 'object') {
    throw createError(400, 'INVALID_REQUEST', 'Request body must be a JSON object.');
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name) {
    throw createError(400, 'INVALID_REPO_NAME', 'Repository name is required.');
  }

  const description = typeof payload.description === 'string' ? payload.description : '';
  const visibility = payload.visibility === 'shared' ? 'shared' : 'private';

  const db = await getDb();
  const duplicate = db.data.repos.find(
    (repo) => repo.owner === user.username && repo.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    throw createError(409, 'REPO_NAME_CONFLICT', 'Repository name already exists for this user.');
  }

  const timestamp = new Date().toISOString();
  const repo = {
    id: randomUUID(),
    owner: user.username,
    name,
    description,
    visibility,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.data.repos.push(repo);
  await db.write();

  return repo;
}

async function getRepoForUser(user, repoId) {
  if (!user || !user.username) {
    throw createError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  const id = typeof repoId === 'string' ? repoId.trim() : '';

  if (!id) {
    throw createError(400, 'INVALID_REPO_ID', 'Repository identifier is required.');
  }

  const db = await getDb();
  const repo = db.data.repos.find((item) => item.id === id);

  if (!repo) {
    throw createError(404, 'REPO_NOT_FOUND', 'Repository not found.');
  }

  if (repo.owner !== user.username) {
    throw createError(403, 'FORBIDDEN_REPO_ACCESS', 'You do not have access to this repository.');
  }

  return repo;
}

module.exports = {
  listRepos,
  createRepo,
  getRepoForUser,
};
