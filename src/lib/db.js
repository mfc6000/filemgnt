const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const file = path.join(__dirname, '..', '..', 'db.json');
const adapter = new JSONFile(file);
const defaultData = {
  users: [],
  repos: [],
  files: [],
};
const db = new Low(adapter, defaultData);

async function ensureDataShape() {
  if (!db.data) {
    db.data = {
      users: [],
      repos: [],
      files: [],
    };
  } else {
    db.data.users = db.data.users || [];
    db.data.repos = db.data.repos || [];
    db.data.files = db.data.files || [];
  }
}

async function initDb() {
  await db.read();
  await ensureDataShape();
  await db.write();
  return db;
}

async function getDb() {
  if (!db.data) {
    await initDb();
  }

  return db;
}

module.exports = {
  initDb,
  getDb,
};
