import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export default async function () {
  console.log('\n🛑 Stopping Global PostgreSQL Container...');
  
  const container = (global as any).__TESTCONTAINER__ as StartedPostgreSqlContainer;
  
  if (container) {
    await container.stop();
    console.log('✅ Global PostgreSQL Container stopped');
  } else {
    console.log('⚠️ No global container found to stop');
  }
}
