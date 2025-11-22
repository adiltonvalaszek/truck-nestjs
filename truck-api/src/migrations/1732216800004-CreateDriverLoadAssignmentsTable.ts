import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDriverLoadAssignmentsTable1732216800004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE assignment_status_enum AS ENUM ('ASSIGNED', 'COMPLETED', 'CANCELLED');
      
      CREATE TABLE IF NOT EXISTS driver_load_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        driver_id UUID NOT NULL,
        load_id UUID NOT NULL,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE,
        status assignment_status_enum DEFAULT 'ASSIGNED' NOT NULL,
        
        CONSTRAINT fk_driver_load_assignment_driver 
          FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
        CONSTRAINT fk_driver_load_assignment_load 
          FOREIGN KEY (load_id) REFERENCES loads(id) ON DELETE CASCADE,
        CONSTRAINT uq_driver_load_assignment 
          UNIQUE (driver_id, load_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_driver_load_assignments_driver_id ON driver_load_assignments(driver_id);
      CREATE INDEX IF NOT EXISTS idx_driver_load_assignments_load_id ON driver_load_assignments(load_id);
      CREATE INDEX IF NOT EXISTS idx_driver_load_assignments_status ON driver_load_assignments(status);
      CREATE INDEX IF NOT EXISTS idx_driver_load_assignments_driver_status ON driver_load_assignments(driver_id, status);
      
      COMMENT ON TABLE driver_load_assignments IS 'Driver-load assignments table';
      COMMENT ON COLUMN driver_load_assignments.id IS 'Unique assignment identifier';
      COMMENT ON COLUMN driver_load_assignments.driver_id IS 'Assigned driver ID';
      COMMENT ON COLUMN driver_load_assignments.load_id IS 'Assigned load ID';
      COMMENT ON COLUMN driver_load_assignments.assigned_at IS 'Assignment timestamp';
      COMMENT ON COLUMN driver_load_assignments.completed_at IS 'Completion timestamp';
      COMMENT ON COLUMN driver_load_assignments.status IS 'Current assignment status';
      COMMENT ON TYPE assignment_status_enum IS 'Possible assignment statuses';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS driver_load_assignments;
      DROP TYPE IF EXISTS assignment_status_enum;
    `);
  }
}
