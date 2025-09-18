require('dotenv').config();
const { createApp } = require('./app');
const { initDb } = require('./lib/db');

const PORT = process.env.PORT || 3000;

async function start() {
  await initDb();

  const app = createApp();

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
