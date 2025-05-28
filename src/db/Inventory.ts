import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', default: 0 })
  sku: number;

  @Column({ default: 0 })
  totalQuantity: number;

  @Column({ default: "" })
  prezzoVendita: string;

  @Column({ default: "" })
  costoArticoli: string;

  @Column({ default: "" })
  iva: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User; // This will create a `userId` column in the database.
  
  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updatedAt: Date;
  
}
