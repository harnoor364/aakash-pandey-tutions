import { createApp, loadConfig } from './app.js';
import { openDb } from './db.js';
import { seed } from './seed.js';

const config = loadConfig();
const db = openDb(config.dbFile);

// First run in dev: fill the database with sample tutors and reviews.
if (config.devMode && db.prepare('SELECT COUNT(*) AS n FROM tutors').get().n === 0) {
  seed(db);
  console.log('Seeded sample data.');
}

const { app } = createApp(config, db);
app.listen(config.port, () => {
  console.log(`Padhai Punjab API on http://localhost:${config.port} (${config.devMode ? 'dev mode: OTPs are logged' : 'production'})`);
});
