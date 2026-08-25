const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.dbUrl,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
