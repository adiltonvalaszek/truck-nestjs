#!/usr/bin/env node

/**
 * TypeORM Migration Runner
 * Runs pending migrations on application startup
 */

require('reflect-metadata');
const { AppDataSource } = require('./data-source');

async function runMigrations() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    console.log('🔄 Running pending migrations...');
    const migrations = await AppDataSource.runMigrations();
    
    if (migrations.length === 0) {
      console.log('ℹ️  No pending migrations');
    } else {
      console.log(`✅ Executed ${migrations.length} migration(s):`);
      migrations.forEach(migration => {
        console.log(`   - ${migration.name}`);
      });
    }

    await AppDataSource.destroy();
    console.log('✅ Migration process completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
