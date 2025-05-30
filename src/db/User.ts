import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()               // Indirizzo Negozio
  shopAddress: string;

  @Column({unique: true})
  customerId: string;     // RetailerId, clientId

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ default: "" })
  accessToken: string;

  @Column({ default: 0 })
  otp: number;

  @Column({ default: false })
  otpVerified: boolean;

  @Column({ type: "timestamp", nullable: true })
  otpExipredAt: Date;

  @Column({ default: false })
  accountVerified: boolean;

  @Column({ default: "" })  // Rag. Sociale -> VAT
  companyName: string;

  @Column({ default: "" })  // VAT
  vat: string;

  @Column({ default: "" })  // Via
  street: string;

  @Column({ default: "" })  // Numero Civico
  houseNumber: string;

  @Column({ default: '' })  // CAP -> zip code
  zipCode: string;

  @Column({ default: "" })  // Country Code
  country: string;

  @Column({ default: "" })  // Città
  city: string;

  @Column({ default: "" })  // Codice Provincia
  provinceCode: string;

  @Column({ default: "" })  // phone
  phone: string;

  @Column({ default: false })
  sentFileUploadEmail: boolean;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
  
}
