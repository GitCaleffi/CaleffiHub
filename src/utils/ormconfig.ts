import { DataSource } from "typeorm";
import 'dotenv/config';
import { User } from "../db/User";
import { TestBarcode } from "../db/TestBarcode";
import { BarcodeScanLog } from "../db/BarcodeScanLog";
import { Device } from "../db/Device";
import { Inventory } from "../db/Inventory";
import { Order } from "../db/Order";
import { Notification } from "../db/Notification";
import { OrdersAssignment } from "../db/OrderAssignment";
if (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
  throw new Error("Missing database environment variables. Check .env file.");
}

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: true,  // Set to false in production
  logging: false,
  entities: [User, TestBarcode, BarcodeScanLog, Device, Inventory, Order, Notification, OrdersAssignment],
  ssl: true,
});
