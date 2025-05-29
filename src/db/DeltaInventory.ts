import { Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class DeltaInventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', default: 0 })
  sku: number;

  @Column({ default: 0 })
  totalQuantity: number;
  
}
