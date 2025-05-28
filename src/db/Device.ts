import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity()
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User; // This will create a `userId` column in the database.

  @Column()
  customerId: string;

  @Column()
  deviceId: string; // System-generated barcode

  @Column({ default: false })
  verified: boolean;

  @Column({ default: false })
  isDeleted: boolean;
}
