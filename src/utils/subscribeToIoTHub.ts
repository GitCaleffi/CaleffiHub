import { EventHubConsumerClient } from "@azure/event-hubs";
import { AppDataSource } from "../utils/ormconfig";
import { BarcodeScanLog } from "../db/BarcodeScanLog";
import { Notification } from "../db/Notification";
import 'dotenv/config';
import { Device } from "../db/Device";
import { Order } from "../db/Order";
import { Inventory } from "../db/Inventory";
import { Registry } from "azure-iothub";

const connectionString = process.env.IOTHUB_EVENTHUB_CONNECTION_STRING!;
const eventHubName = process.env.IOTHUB_EVENTHUB_NAME!;



//   Generate SAS Token dynamically using the IOTHUB_HOSTNAME and SharedAccessKey
const crypto = require("crypto");

function generateSasToken(resourceUri: any, signingKey: any, policyName: any, expiresInMins: any) {
    const expiry = Math.floor(new Date().getTime() / 1000) + expiresInMins * 60;
    const stringToSign = encodeURIComponent(resourceUri) + "\n" + expiry;
    const hmac = crypto.createHmac("sha256", Buffer.from(signingKey, "base64"));
    hmac.update(stringToSign);
    const signature = hmac.digest("base64");

    return `SharedAccessSignature sr=${encodeURIComponent(resourceUri)}&sig=${encodeURIComponent(signature)}&se=${expiry}${policyName ? "&skn=" + policyName : ""}`;
}

const IOTHUB_HOSTNAME = "CaleffiIoT.azure-devices.net";
const SHARED_ACCESS_KEY = "SDxMGzrOzAtRSdErS0yK/CNu8M7vLGh7HHV/xIBUAHg=";
const DEVICE_ID = "raspberrypi-iot";
const expiresInMins = 60; // Token valid for 60 minutes

const sasToken = generateSasToken(`${IOTHUB_HOSTNAME}/devices/${DEVICE_ID}`, SHARED_ACCESS_KEY, null, expiresInMins);
console.log("Generated SAS Token: ", sasToken);



export const subscribeToIoTHub = async (callback?: (data: any) => void) => {
    if (!connectionString || !eventHubName) {
        console.error("Missing IoT Hub Event Hub connection details in environment variables.");
        return;
    }

    const consumerClient = new EventHubConsumerClient("$Default", connectionString, eventHubName);
    console.log("Listening for barcode scans...");

    consumerClient.subscribe({
        processEvents: async (events: any) => {
            for (const event of events) {
                const { deviceId, scannedBarcode } = event.body;
                console.log("Received Barcode:", scannedBarcode, "from Device:", deviceId);

                // Validate barcode in database
                // const user = await AppDataSource.getRepository(User).findOne({ where: { deviceId } });
                const deviceRepository = AppDataSource.getRepository(Device);
                const device = await deviceRepository.findOne({
                    where: { deviceId },
                    relations: ["user"],
                });

                const testBarcode = await AppDataSource.getRepository(BarcodeScanLog).findOne({ where: { scannedBarcode: scannedBarcode } });
                // if (device && testBarcode) {
                if (device) {
                    console.log(" Barcode Matched. Redirecting user to Order Status.", event.body);
                    // Update the device's `verified` status to true
                    device.verified = true;
                    await deviceRepository.save(device);

                    await updateOrderQuantity(event.body);
                    await subtractInventoryQuantity(event.body, device);

                    const notificationRepository = AppDataSource.getRepository(Notification);
                    const notification = notificationRepository.create({
                        user: { id: device?.user?.id },
                        message: "Order and Inventory quantity updated from IOT Hub",
                    });
                    await notificationRepository.save(notification);


                    if (callback) callback({ ...event.body, userId: device?.user?.id });
                } else {
                    console.log(" Invalid Barcode. Ignoring.");
                }
            }
        },
        processError: async (err: any) => {
            console.error(" Error processing events:", err);
        },
    });
};


// last device activity
const iothubConnectionString = process.env.IOTHUB_CONNECTION_STRING!;
const registry = Registry.fromConnectionString(iothubConnectionString);
export const lastDeviceActivity = async (sixHoursAgo: Date) => {
    try {
        const result: any = await registry.list();
        const devices = result.responseBody; // extract the array of devices
        const deviceIds = devices.map((device: any) => device.deviceId);
        let finalDeviceIdArr = [];

        // Fetch device twin
        for (let deviceId of deviceIds) {
            const twin: any = await registry.getTwin(deviceId);
            const lastActivityTime = new Date(twin.responseBody.lastActivityTime); // this is the correct path

            if (lastActivityTime < sixHoursAgo) {
                console.log(`${deviceId}: No activity in the last 6 hours.`, lastActivityTime);
                finalDeviceIdArr.push({ deviceId: deviceId, lastActivityTime: lastActivityTime });
            }
            else {
                console.log(`${deviceId}: Has activity in the last 6 hours.`, lastActivityTime);
            }
        }
        return finalDeviceIdArr;
    }
    catch (error: any) {
        throw (error)
    }
};


// update order quantity
const updateOrderQuantity = async (bodyData: any) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const order: any = await orderRepository.findOneBy({ deviceId: bodyData.deviceId, sku: bodyData.scannedBarcode });

        if (!order) {
            const newOrder = orderRepository.create({
                deviceId: bodyData.deviceId,
                sku: bodyData.scannedBarcode,
                consumedQuantity: 1,
            });
            await orderRepository.save(newOrder);
        }
        else {
            order.consumedQuantity += 1;
            await orderRepository.save(order);
        }

        return true
    } catch (error) {
        throw (error)
    }
};

// subtract inventory quantity
const subtractInventoryQuantity = async (bodyData: any, device: any) => {
    try {
        const inventoryRepository = AppDataSource.getRepository(Inventory);
        const inventory: any = await inventoryRepository.findOneBy({ user: { id: device?.user?.id }, sku: bodyData.scannedBarcode });

        if (!inventory) {
            const newInventory = inventoryRepository.create({
                sku: bodyData.scannedBarcode,
                totalQuantity: -1,
                user: { id: device?.user?.id },
            });
            await inventoryRepository.save(newInventory);
        }
        else {
            inventory.totalQuantity -= 1;
            await inventoryRepository.save(inventory);
        }

        return true
    } catch (error) {
        throw (error)
    }
};

