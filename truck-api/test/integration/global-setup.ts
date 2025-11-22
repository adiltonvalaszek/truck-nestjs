import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Wait } from 'testcontainers';

export default async function () {
  console.log('\n🚀 Starting Global PostgreSQL Container...');

  const container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('testdb')
    .withUsername('testuser')
    .withPassword('testpass')
    .withStartupTimeout(120000)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const host = container.getHost();
  const port = container.getPort();
  const username = container.getUsername();
  const password = container.getPassword();
  const database = container.getDatabase();

  const connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;
  process.env.TEST_DB_URL = connectionString;
  
  // Write to a file so tests can read it (since globalSetup runs in a separate process)
  const fs = require('fs');
  const path = require('path');
  fs.writeFileSync(path.join(__dirname, 'test-env.json'), JSON.stringify({ TEST_DB_URL: connectionString }));
  
  (global as any).__TESTCONTAINER__ = container;
  
  console.log(`\n🐳 Global PostgreSQL Container started at ${host}:${port}`);
}
