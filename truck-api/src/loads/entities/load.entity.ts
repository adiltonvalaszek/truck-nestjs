import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { DriverLoadAssignment } from '../../assignments/entities/driver-load-assignment.entity';

export enum LoadStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

@Entity('loads')
export class Load {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  origin: string;

  @Column('varchar', { length: 255 })
  destination: string;

  @Column('varchar', { length: 100, name: 'cargo_type' })
  cargoType: string;

  @Column('varchar', { length: 20, default: LoadStatus.PENDING })
  status: LoadStatus;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => DriverLoadAssignment, assignment => assignment.load)
  assignments: DriverLoadAssignment[];
}