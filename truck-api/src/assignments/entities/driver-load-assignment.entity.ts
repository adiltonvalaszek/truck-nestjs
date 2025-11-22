import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Driver } from '../../drivers/entities/driver.entity';
import { Load } from '../../loads/entities/load.entity';

export enum AssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

@Entity('driver_load_assignments')
@Index(['driverId', 'status'])
export class DriverLoadAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'driver_id' })
  driverId: string;

  @Column('uuid', { name: 'load_id' })
  loadId: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'assigned_at' })
  assignedAt: Date;

  @Column('timestamp with time zone', { name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column('varchar', { length: 20, default: AssignmentStatus.ASSIGNED })
  status: AssignmentStatus;

  @ManyToOne(() => Driver, driver => driver.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @ManyToOne(() => Load, load => load.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'load_id' })
  load: Load;
}