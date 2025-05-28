import http from "http";
import express from "express";
import { applyMiddleware, applyRoutes } from "./utils";
import routes from "./services";
import multer from "multer";
import path from "path";
import cors from "cors";
import 'dotenv/config';
import "reflect-metadata";
import { AppDataSource } from "./utils/ormconfig";
import { Server } from "socket.io";
import { subscribeToIoTHub } from "./utils/subscribeToIoTHub";


const router = express();

// cron job file
require('./utils/cron-job');

// Add this middleware to parse JSON requests
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// View Engine Configuration
router.set('views', path.join(__dirname, 'views'));
router.set("view engine", "ejs");

const upload: any = multer({ dest: "temp/" });
router.use(upload.any());
router.use(cors({ origin: "*" }));

applyRoutes(routes, router);


const PORT = process.env.PORT || 9000;
const server = http.createServer(router);

const io = new Server(server);
export { io }; // export socket instance

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

// Start listening to IoT Hub messages and send to frontend
subscribeToIoTHub((data) => {
  io.emit("barcode-scanned", data);
});

// Database Connection Initialization
AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to database:", error);
    // process.exit(1); // Exit process if DB connection fails
  });
