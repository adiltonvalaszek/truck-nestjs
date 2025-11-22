import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { DriverLoadAssignment } from '../../assignments/entities/driver-load-assignment.entity';

export enum DriverStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  INACTIVE = 'INACTIVE'
}

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 50, unique: true, name: 'license_number' })
  licenseNumber: string;

  @Column('varchar', { length: 20, default: DriverStatus.AVAILABLE })
  status: DriverStatus;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => DriverLoadAssignment, assignment => assignment.driver)
  assignments: DriverLoadAssignment[];
}