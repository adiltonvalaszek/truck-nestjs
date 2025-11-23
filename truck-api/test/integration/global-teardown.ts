import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedRedisContainer } from '@testcontainers/redis';

export default async function () {
  console.log('\n🛑 Stopping Global Test Containers...');
  
  const postgresContainer = (global as any).__POSTGRES_CONTAINER__ as StartedPostgreSqlContainer;
  const redisContainer = (global as any).__REDIS_CONTAINER__ as StartedRedisContainer;
  
  // Stop containers in parallel for faster cleanup
  const promises = [];
  
  if (postgresContainer) {
    promises.push(
      postgresContainer.stop().then(() => console.log('✅ PostgreSQL Container stopped'))
    );
  } else {
    console.log('⚠️ No PostgreSQL container found to stop');
  }

  if (redisContainer) {
    promises.push(
      redisContainer.stop().then(() => console.log('✅ Redis Container stopped'))
    );
  } else {
    console.log('⚠️ No Redis container found to stop');
  }

  if (promises.length > 0) {
    await Promise.all(promises);
    console.log('🏁 All test containers stopped successfully\n');
  }
}
