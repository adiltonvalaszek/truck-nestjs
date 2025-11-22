import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1732216800001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      
      COMMENT ON TABLE users IS 'System users table';
      COMMENT ON COLUMN users.id IS 'Unique user identifier';
      COMMENT ON COLUMN users.name IS 'User full name';
      COMMENT ON COLUMN users.email IS 'Unique user email';
      COMMENT ON COLUMN users.password IS 'Encrypted user password';
      COMMENT ON COLUMN users.created_at IS 'Record creation timestamp';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
  }
}
