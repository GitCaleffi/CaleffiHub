import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deviceId: string;

  @Column({ type: 'bigint', default: 0 })
  sku: number;

  @Column({ default: 0 })
  consumedQuantity: number;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
