// This table will store scanned barcode attempts.

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity()
export class BarcodeScanLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.id)
  user: User;

  @Column()
  scannedBarcode: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  scannedAt: Date;
}
