import { Client, Message } from "azure-iot-device";
import { Mqtt } from "azure-iot-device-mqtt";
import 'dotenv/config';

// Replace with your IoT Hub Device Connection String
const connectionString = `HostName=${process.env.IOTHUB_HOSTNAME};DeviceId=${process.env.IOTHUB_DEVICEID};SharedAccessKey=${process.env.IOTHUB_SHARED_ACCESSKEY}`

// Create an IoT Hub client
const client = Client.fromConnectionString(connectionString, Mqtt);

export const sendToIoTHub = async (deviceId: string, barcode: string, sku: any) => {
  try {
    await client.open();
    console.log("Connected to Azure IoT Hub");

    // Create message payload
    const payload = JSON.stringify({
      deviceId,
      scannedBarcode: barcode,
      sku,
      timestamp: new Date().toISOString(),
    });
    console.log("Message sent to IoT Hub:", payload);

    // Create and send the message
    const message = new Message(payload);
    let result = await client.sendEvent(message);

    console.log('message response: ', result);
  } catch (error) {
    console.error("Failed to send data to IoT Hub:", error);
  } finally {
    await client.close();
  }
};
