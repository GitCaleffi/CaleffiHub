// This table stores the fixed barcode that users will scan for validation.

import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class TestBarcode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  barcode: string;  // Fixed barcode for validation

  @Column({ default: false })
  isActive: boolean;
}
