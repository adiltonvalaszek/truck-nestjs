import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDriversTable1732216800002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE driver_status_enum AS ENUM ('AVAILABLE', 'BUSY', 'INACTIVE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        license_number VARCHAR(50) NOT NULL UNIQUE,
        status driver_status_enum DEFAULT 'AVAILABLE' NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_drivers_license_number ON drivers(license_number);
      CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
      
      COMMENT ON TABLE drivers IS 'Drivers table';
      COMMENT ON COLUMN drivers.id IS 'Unique driver identifier';
      COMMENT ON COLUMN drivers.name IS 'Driver full name';
      COMMENT ON COLUMN drivers.license_number IS 'Unique driver license number';
      COMMENT ON COLUMN drivers.status IS 'Current driver status';
      COMMENT ON COLUMN drivers.created_at IS 'Record creation timestamp';
      COMMENT ON TYPE driver_status_enum IS 'Possible driver statuses';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS drivers;
      DROP TYPE IF EXISTS driver_status_enum;
    `);
  }
}
