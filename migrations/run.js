#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const REQUIRED = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  console.error(`Check the .env file at the CCC project root.`);
  process.exit(1);
}

async function main() {
  const conn = await mariadb.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    const dir = __dirname;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.error('No .sql files found in migrations/');
      process.exit(1);
    }

    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      console.log(`Running ${file}...`);
      await conn.query(sql);
      console.log(`  ${file} done`);
    }

    const tables = await conn.query('SHOW TABLES');
    const key = `Tables_in_${process.env.DB_NAME}`;
    console.log('\nTables in database:');
    for (const row of tables) {
      console.log(`  - ${row[key]}`);
    }
    console.log('\nMigration complete.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
