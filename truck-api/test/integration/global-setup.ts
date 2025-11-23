import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { Wait } from 'testcontainers';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkDockerRunning(): Promise<boolean> {
  try {
    await execAsync('docker info');
    return true;
  } catch (error) {
    return false;
  }
}

export default async function () {
  console.log('\n🚀 Starting Global Test Containers...');

  // Check if Docker is running
  const isDockerRunning = await checkDockerRunning();
  if (!isDockerRunning) {
    console.error('\n❌ Docker is not running!');
    console.error('📋 To run integration tests, please:');
    console.error('   1. Start Docker Desktop (or Docker service)');
    console.error('   2. Wait for Docker to be ready');
    console.error('   3. Run the integration tests again\n');
    process.exit(1);
  }

  try {
    console.log('🐳 Starting PostgreSQL container...');
    const postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('testdb')
      .withUsername('testuser')
      .withPassword('testpass')
      .withStartupTimeout(120000)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    console.log('🔴 Starting Redis container...');
    const redisContainer = await new RedisContainer('redis:7-alpine')
      .withStartupTimeout(120000)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    // PostgreSQL connection
    const pgHost = postgresContainer.getHost();
    const pgPort = postgresContainer.getPort();
    const pgUsername = postgresContainer.getUsername();
    const pgPassword = postgresContainer.getPassword();
    const pgDatabase = postgresContainer.getDatabase();
    const connectionString = `postgresql://${pgUsername}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;

    // Redis connection
    const redisHost = redisContainer.getHost();
    const redisPort = redisContainer.getPort();

    // Set environment variables
    process.env.TEST_DB_URL = connectionString;
    process.env.REDIS_HOST = redisHost;
    process.env.REDIS_PORT = redisPort.toString();
    
    // Write to a file so tests can read it (since globalSetup runs in a separate process)
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(path.join(__dirname, 'test-env.json'), JSON.stringify({ 
      TEST_DB_URL: connectionString,
      REDIS_HOST: redisHost,
      REDIS_PORT: redisPort.toString()
    }));
    
    // Store containers for cleanup
    (global as any).__POSTGRES_CONTAINER__ = postgresContainer;
    (global as any).__REDIS_CONTAINER__ = redisContainer;
    
    console.log(`\n🐳 PostgreSQL Container started at ${pgHost}:${pgPort}`);
    console.log(`🔴 Redis Container started at ${redisHost}:${redisPort}`);
    console.log('✅ All test containers are ready!\n');
  } catch (error) {
    console.error('\n❌ Failed to start test containers:');
    console.error('📋 Please check:');
    console.error('   1. Docker is running and accessible');
    console.error('   2. You have sufficient resources (memory/disk)');
    console.error('   3. Required ports are not already in use');
    console.error(`\n💥 Error details: ${error.message}\n`);
    process.exit(1);
  }
}
