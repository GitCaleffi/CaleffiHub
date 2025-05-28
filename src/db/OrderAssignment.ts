import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn
  } from "typeorm";
  import { User } from "./User";
  
  export enum AssignmentStatus {
    ACCEPTED = "accepted",
    REJECTED = "rejected",
    PENDING = "pending",
    SHIPPED = "shipped"
  }
  
  @Entity()
  export class OrdersAssignment {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ type: 'bigint', default: 0 })
    orderId: number

    @Column({
      type: "enum",
      enum: AssignmentStatus,
    })
    status: AssignmentStatus;
  
    @Column()   //retailer id
    user: string;
  
    @Column()
    email: string;

    @Column()
    phone: string;

    @Column({ type: 'bigint', default: 0 })
    orderNumber: number

    @Column()
    orderName: string;

    @Column()
    billingAddress: string;

    @Column()
    name: string;

    @Column({ type: "numeric", default: 0 })
    amount: number;
  
    @Column()
    location_id: string;
  
    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;
  
    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt: Date;
  }
  