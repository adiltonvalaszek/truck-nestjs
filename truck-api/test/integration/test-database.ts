import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Wait } from 'testcontainers';
import { DataSource } from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { Driver } from '@/drivers/entities/driver.entity';
import { Load } from '@/loads/entities/load.entity';
import { DriverLoadAssignment } from '@/assignments/entities/driver-load-assignment.entity';

export class TestDatabase {
  private static container: StartedPostgreSqlContainer;
  private static dataSource: DataSource;
  private static connectionString: string;
  private static dbConfig: any;

  static async start(): Promise<void> {
    // Try to read from global setup file
    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.join(__dirname, 'test-env.json');
      
      if (fs.existsSync(envPath)) {
        const envConfig = JSON.parse(fs.readFileSync(envPath, 'utf8'));
        if (envConfig.TEST_DB_URL) {
          console.log('🚀 Connecting to Global PostgreSQL container...');
          
          this.connectionString = envConfig.TEST_DB_URL;
          
          // Parse connection string to populate dbConfig if needed, or just store it
          // For simplicity, let's parse it or just use the URL in DataSource
          const url = new URL(this.connectionString);
          this.dbConfig = {
            host: url.hostname,
            port: parseInt(url.port),
            username: url.username,
            password: url.password,
            database: url.pathname.substring(1), // remove leading slash
          };

          this.dataSource = new DataSource({
            type: 'postgres',
            host: this.dbConfig.host,
            port: this.dbConfig.port,
            username: this.dbConfig.username,
            password: this.dbConfig.password,
            database: this.dbConfig.database,
            entities: [User, Driver, Load, DriverLoadAssignment],
            synchronize: true,
            dropSchema: false,
            logging: false,
          });

          await this.dataSource.initialize();
          console.log('✅ Connected to global test database');
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read global test config, falling back to local container:', e);
    }

    console.log('🚀 Starting PostgreSQL container (Fallback)...');
    
    // Start PostgreSQL container with longer timeout
    this.container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('testdb')
      .withUsername('testuser')
      .withPassword('testpass')
      .withStartupTimeout(120000) // 2 minutes timeout
      .withWaitStrategy(Wait.forListeningPorts()) // Wait for port instead of health check
      .start();

    console.log('🐳 PostgreSQL container started:', {
      host: this.container.getHost(),
      port: this.container.getPort(),
      database: this.container.getDatabase(),
    });

    this.dbConfig = {
      host: this.container.getHost(),
      port: this.container.getPort(),
      username: this.container.getUsername(),
      password: this.container.getPassword(),
      database: this.container.getDatabase(),
    };

    this.connectionString = `postgresql://${this.dbConfig.username}:${this.dbConfig.password}@${this.dbConfig.host}:${this.dbConfig.port}/${this.dbConfig.database}`;

    // Create DataSource
    this.dataSource = new DataSource({
      type: 'postgres',
      host: this.container.getHost(),
      port: this.container.getPort(),
      username: this.container.getUsername(),
      password: this.container.getPassword(),
      database: this.container.getDatabase(),
      entities: [User, Driver, Load, DriverLoadAssignment],
      synchronize: true, // For tests, we can use synchronize
      dropSchema: false, // Don't drop schema between tests
      logging: false, // Disable logging in tests
    });

    await this.dataSource.initialize();
    console.log('✅ Test database initialized');
  }

  static async stop(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
    
    // Only stop the container if we started it locally (this.container is set)
    // If we used the global container, this.container will be undefined
    if (this.container) {
      await this.container.stop();
      console.log('🛑 PostgreSQL container stopped');
    }
  }

  static async cleanup(): Promise<void> {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      return;
    }

    // Clean all tables using TRUNCATE CASCADE
    const entities = this.dataSource.entityMetadatas;
    const tableNames = entities.map(entity => `"${entity.tableName}"`).join(', ');
    
    if (tableNames.length > 0) {
      await this.dataSource.query(`TRUNCATE TABLE ${tableNames} CASCADE;`);
    }
    
    console.log('🧹 Database cleaned');
  }

  static getDataSource(): DataSource {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('Database not initialized. Call TestDatabase.start() first.');
    }
    return this.dataSource;
  }

  static getConnectionString(): string {
    if (!this.connectionString) {
      throw new Error('Database not initialized. Call TestDatabase.start() first.');
    }
    return this.connectionString;
  }

  static getDatabaseConfig() {
    if (!this.dbConfig) {
      throw new Error('Database not initialized. Call TestDatabase.start() first.');
    }
    return this.dbConfig;
  }
}