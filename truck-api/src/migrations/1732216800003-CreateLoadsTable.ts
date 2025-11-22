import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoadsTable1732216800003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE load_status_enum AS ENUM ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      CREATE TABLE IF NOT EXISTS loads (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        origin VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        cargo_type VARCHAR(100) NOT NULL,
        status load_status_enum DEFAULT 'PENDING' NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_loads_status ON loads(status);
      CREATE INDEX IF NOT EXISTS idx_loads_cargo_type ON loads(cargo_type);
      
      COMMENT ON TABLE loads IS 'Loads/shipments table';
      COMMENT ON COLUMN loads.id IS 'Unique load identifier';
      COMMENT ON COLUMN loads.origin IS 'Load origin location';
      COMMENT ON COLUMN loads.destination IS 'Load destination location';
      COMMENT ON COLUMN loads.cargo_type IS 'Type of cargo being transported';
      COMMENT ON COLUMN loads.status IS 'Current load status';
      COMMENT ON COLUMN loads.created_at IS 'Record creation timestamp';
      COMMENT ON TYPE load_status_enum IS 'Possible load statuses';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS loads;
      DROP TYPE IF EXISTS load_status_enum;
    `);
  }
}
