import { AppDataSource } from "./ormconfig";
import { User } from "../db/User";
import { Inventory } from "../db/Inventory";
import ejs from "ejs";
import { MailerUtilities } from "./MailerUtilities";
import { lastDeviceActivity } from "./subscribeToIoTHub";
import { Device } from "../db/Device";
import { Notification } from "../db/Notification";
import { io } from '../server'; //  adjust path as needed
import { CommonUtilities } from "./CommonUtilities";
import axios from "axios";
import { MESSAGES } from "./messages";
import { AssignmentStatus, OrdersAssignment } from "../db/OrderAssignment";
import pLimit from 'p-limit';
import { In, LessThan } from "typeorm";
import { DeltaInventory } from "../db/DeltaInventory";
const limitConcurrency = pLimit(5); // Limit to 5 concurrent requests to respect rate limits
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const LOCATION_ID = process.env.LOCATION_ID
const BASE_URL = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2024-10`;

export class CronUtilities {

  //  cron-job to send Upload Reminder  
  public static async sendFileUploadEmail() {
    try {
      const userRepository = AppDataSource.getRepository(User);

      const users = await userRepository
        .createQueryBuilder("user")
        .leftJoin(Inventory, "inventory", "inventory.userId = user.id")
        .where("user.accountVerified = :verified", { verified: true })
        .andWhere("user.isDeleted = :deleted", { deleted: false })
        .andWhere("user.sentFileUploadEmail = :emailSent", { emailSent: false })
        .andWhere("inventory.id IS NULL")
        .andWhere("user.createdAt < NOW() - INTERVAL '1 hour'")
        .select(["user.email"])
        .getMany();

      console.log("users  ============= ", users);

      if (users?.length > 0) {
        const recipientEmails = users.map((user) => user.email);

        // send inventory file Upload Alert email 
        let messageHtml = await ejs.renderFile(process.cwd() + "/src/views/fileUploadAlert.ejs", {}, { async: true });
        let mailResponse: any = await MailerUtilities.sendSendgridMail({ recipient_email: recipientEmails, subject: "Catalog Upload Reminder", text: messageHtml });

        if (mailResponse?.message == 'success') {
          // Update sentFileUploadEmail = true for all affected users
          await userRepository
            .createQueryBuilder()
            .update(User)
            .set({ sentFileUploadEmail: true })
            .where("email IN (:...emails)", { emails: recipientEmails })
            .execute();
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  public static getTopInventoryWithMaxMargin = (inventoryList: any[], orderUserId: string) => {
    // Filter out inventory with same customerId as the order user
    const filtered = inventoryList.filter(inv => inv.customerId !== orderUserId);

    // If nothing left after filtering, return null or do nothing
    if (filtered.length === 0) return null;

    // Find inventory with the maximum margin
    const topInventory = filtered.reduce((prev, curr) => {
      return (curr.margin > prev.margin) ? curr : prev;
    });

    return topInventory;
  };

  // cron-job to about last scanned sku 
  public static async checkLastActivity() {
    try {
      const now = new Date();
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      const deviceIds = await lastDeviceActivity(sixHoursAgo);
      const deviceRepository = AppDataSource.getRepository(Device);
      const notificationRepository = AppDataSource.getRepository(Notification);

      for (let data of deviceIds) {
        const deviceData = await deviceRepository
          .createQueryBuilder("device")
          .leftJoinAndSelect("device.user", "user")
          .where("device.deviceId = :deviceId", { deviceId: data.deviceId })
          .andWhere("device.isDeleted = false")
          .andWhere("device.verified = true")
          .andWhere("user.isDeleted = false")
          .getOne();

        if (deviceData) {
          let lastActivityAt = new Date(data.lastActivityTime);
          const diffMs = now.getTime() - lastActivityAt.getTime(); // difference in milliseconds
          const diffHours = diffMs / (1000 * 60 * 60); // convert ms to hours

          let notificationMessage = `The Raspberry device may not be active or properly attached with device ${data.deviceId}, as its last activity was ${diffHours.toFixed(2)} hours ago.`;

          io.emit('checkLastActivity', { message: notificationMessage, userId: deviceData?.user?.id });

          const notification = notificationRepository.create({
            user: { id: deviceData?.user?.id },
            message: notificationMessage,
          });
          await notificationRepository.save(notification);
        }
      }
      return;
    }
    catch (error) {
      console.log("Error fetching device twin:", error);
    }
  }

  // Runs every 15 minutes to upload Delta Inventory
  public static async uploadDeltaInventory() {
    try {
      console.log(">>>> cron job is running :uploadDeltaInventory >>>")
      const inventoryRepository = AppDataSource.getRepository(Inventory);
      const deltaInventoryRepository = AppDataSource.getRepository(DeltaInventory);

      const aggregatedInventory = await inventoryRepository
        .createQueryBuilder("inventory")
        .select("inventory.sku", "sku")
        .addSelect("SUM(inventory.totalQuantity)", "totalQuantity")
        .groupBy("inventory.sku")
        .getRawMany();

      if (!aggregatedInventory.length) return

      let calculatedDeltaArr: any = [];
      for (const item of aggregatedInventory) {
        const sku = parseInt(item.sku, 10); // Because the original value is a string
        const totalQuantity = parseInt(item.totalQuantity, 10);

        const existingDelta = await deltaInventoryRepository.findOne({ where: { sku } });

        if (!existingDelta) {
          const newDelta = await deltaInventoryRepository.create({ sku, totalQuantity });
          await deltaInventoryRepository.save(newDelta);
          calculatedDeltaArr.push(newDelta);
        }
        else if (existingDelta.totalQuantity !== totalQuantity) {
          existingDelta.totalQuantity = totalQuantity;
          await deltaInventoryRepository.save(existingDelta);
          calculatedDeltaArr.push(existingDelta);
        }
      }

      if (calculatedDeltaArr?.length > 0) {
        console.log('calculatedDeltaArr >>>> ', calculatedDeltaArr);

        const now = new Date();
        const getFormattedDate = now.toLocaleDateString("it-IT").replace(/\//g, "/").slice(0, 8);

        const stocks = calculatedDeltaArr.map((item: any) => ({
          "Cod_Art": item.sku,
          "Cod_Mag": "R1",
          "Quant_Disponibile": item.totalQuantity.toString(),
          "Stock_out_of_Stock": "N",
          "Art_Attivo": "N",
          "Quant_Previsione": "000000000",
          "Ord_Status": "",
          "Data_Ultima_Elabor": getFormattedDate,
          "Ora_Ultima_Elabor": getFormattedDate
        }));

        const response = await axios.post(`https://webhooks.getmesa.com/v1/caleffispa/trigger-webhook/665812c988cacd331602e39e/665812dc1f76a7af030dc2e6.json?apikey=${process.env.SHOPIFY_API_KEY}`, {
          stocks
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log("Inventory updated successfully using cron job");
      }
      return
    } catch (error) {
      console.error("Error uploading inventory:", error);
    }
  }

  public static async assignOrderToLocation() {
    try {
      console.log(">>>> cron job is running :assignOrderToLocation >>>");

      const userRepository = AppDataSource.getRepository(User);
      const inventoryRepository = AppDataSource.getRepository(Inventory);
      const assignmentRepo = AppDataSource.getRepository(OrdersAssignment);
      const notificationRepository = AppDataSource.getRepository(Notification);
      const users = await userRepository.find();

      if (users?.length > 0) {
        let url = `${BASE_URL}/orders.json?fulfillment_status=unfulfilled`;
        let orders: any[] = [];
        let nextUrl = url;

        while (nextUrl) {
          const response = await axios.get(nextUrl, {
            headers: {
              'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          });

          orders = [...orders, ...response.data.orders || []];

          const linkHeader = response.headers.link;
          const matches = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
          nextUrl = matches?.[1] || null;

          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        for (const user of users) {
          const inventoryList = await inventoryRepository.find({
            where: { user: { id: user.id } },
            relations: ["user"],
            order: { updatedAt: "DESC" },
          });

          if (!inventoryList.length) continue;

          const matchedOrders: any[] = [];

          for (const item of inventoryList) {
            const { prezzoVendita, costoArticoli, sku }: any = item;

            const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2023-10/orders.json?sku=${sku}`;
            const response = await axios.get(url, {
              headers: {
                "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
                "Content-Type": "application/json",
              },
              timeout: 10000,
            });

            const orders = response.data.orders || [];
            let temp: any[] = [];
            let marginCount = 0;

            for (const order of orders) {
              const matchingItem = order.line_items?.find((lineItem: any) => parseInt(lineItem.sku) == parseInt(sku));
              if (matchingItem) {
                const totalAmount = parseFloat(order.total_price || '0');
                const margin = totalAmount - parseFloat(prezzoVendita || '0');
                marginCount += margin;
                temp.push({
                  sku,
                  total_amount: totalAmount,
                  margin,
                  order_id: order.id,
                  order_name: order.name,
                  customer_email: order.email,
                  created_at: order.created_at,
                });
              }
            }
            if (temp.length > 0) {
              matchedOrders.push({
                sku,
                orders: temp,
                customerId: user.customerId,
                margin: marginCount,
                prezzo_vendita: prezzoVendita,
                costoArticoli: costoArticoli,
              });
            }
          }

          if (!matchedOrders.length) continue;

          const topOrder = matchedOrders.reduce((maxItem, currentItem) => {
            return currentItem.margin > maxItem.margin ? currentItem : maxItem;
          }, matchedOrders[0]);


          const enrichedOrders = await Promise.all(
            orders.map((order) =>
              limitConcurrency(async () => {
                try {
                  const fulfillmentResponse = await axios.get(`${BASE_URL}/orders/${order.id}/fulfillment_orders.json`, {
                    headers: {
                      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                      'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                  });

                  const fulfillmentOrders = fulfillmentResponse.data.fulfillment_orders || [];
                  const openFulfillmentOrders = fulfillmentOrders.filter((fo: any) => fo.status === 'open');

                  if (openFulfillmentOrders.length > 0) {
                    return {
                      ...order,
                      location_id: openFulfillmentOrders[0].assigned_location_id,
                      fulfillment_orders: openFulfillmentOrders,
                    };
                  }

                  return order;
                } catch (error: any) {
                  console.error(`Error fetching fulfillment for order ${order.id}:`, error.response?.data || error.message);
                  return order;
                }
              })
            )
          );
          
          const locationId = Number(process.env.LOCATION_ID);

          const filteredOrders = enrichedOrders.filter((order) =>
            order.fulfillment_orders?.some((fo: any) => {
              return fo.assigned_location_id === locationId
            })
          );

          for (const item of filteredOrders) {
            const { id, total_price, customer, name, order_number } = item;

            let address = "";
            if (customer?.default_address) {
              address += customer.default_address.address1 + " " || "";
              address += customer.default_address.city + " " || "";
              address += customer.default_address.zip + " " || "";
              address += customer.default_address.province + " " || "";
              address += customer.default_address.country || "";
            }

            const existingAssignment = await assignmentRepo.findOneBy({ orderId: id });

            if (existingAssignment) {
              console.log(`Skipped existing orderId: ${id}`);
              continue;
            }

            const assignment = assignmentRepo.create({
              orderId: id,
              status: AssignmentStatus.PENDING,
              user: topOrder.customerId.toString(),
              amount: total_price,
              location_id: LOCATION_ID,
              name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
              email: customer.email || "",
              phone: customer.phone || "",
              orderNumber: order_number,
              orderName: name,
              billingAddress: address,
              sku: topOrder.sku,
            });

            await assignmentRepo.save(assignment);

            let notificationMessage = `Order #${order_number} (${name}) has been successfully assigned to you.`;

            io.emit('orderAssigned', { message: notificationMessage, userId: user.id });

            const notification = notificationRepository.create({
              user: { id: user.id },
              message: notificationMessage,
            });
            await notificationRepository.save(notification);

            console.log(`Inserted orderId: ${id}`);
          }
        }
      }

      console.log("Order assignment job completed.");
      return
    } catch (error) {
      console.error("Error assigning order to User:", error);
    }
  }

  public static async reassignmentOrders() {
    try {
      console.log(">>>> cron job is running :reassignmentOrders >>>")

      const userRepository = AppDataSource.getRepository(User);
      const inventoryRepository = AppDataSource.getRepository(Inventory);
      const notificationRepository = AppDataSource.getRepository(Notification);
      const inventoryList = await inventoryRepository.find({
        relations: ["user"],
        order: { updatedAt: "DESC" },
      });

      const matchedOrders: any[] = [];

      for (const item of inventoryList) {
        const { prezzoVendita, costoArticoli, sku, user }: any = item;

        // console.log(item, ">>>> item ")

        const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2023-10/orders.json?sku=${sku}`;
        const response = await axios.get(url, {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        });

        const orders = response.data.orders || [];
        let temp: any[] = [];
        let marginCount = 0;

        for (const order of orders) {
          const matchingItem = order.line_items?.find((lineItem: any) => parseInt(lineItem.sku) == parseInt(sku));
          if (matchingItem) {
            const totalAmount = parseFloat(order.total_price || '0');
            const margin = totalAmount - parseFloat(prezzoVendita || '0');
            marginCount += margin;
            temp.push({
              sku,
              total_amount: totalAmount,
              margin,
              order_id: order.id,
              customerId: user.customerId,
              order_name: order.name,
              customer_email: order.email,
              created_at: order.created_at,
            });
          }
        }
        if (temp.length > 0) {
          matchedOrders.push({
            sku,
            orders: temp,
            id: user.id,
            customerId: user.customerId,
            margin: marginCount,
            prezzo_vendita: prezzoVendita,
            costoArticoli: costoArticoli,
          });
        }
      }

      const assignmentRepository = AppDataSource.getRepository(OrdersAssignment);
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const [assignmentList, total] = await assignmentRepository.findAndCount({
        where: { status: In([AssignmentStatus.PENDING, AssignmentStatus.REJECTED]), createdAt: LessThan(twelveHoursAgo) }
      });

      if (assignmentList && assignmentList.length > 0) {
        assignmentList.forEach(async (item: any) => {
          let orderWithMaxMargin = this.getTopInventoryWithMaxMargin(matchedOrders, item.user);
          if (orderWithMaxMargin) {
            let assignment: any = await assignmentRepository.findOneBy({ id: Number(item.id) });
            assignment.status = AssignmentStatus.PENDING;
            assignment.createdAt = new Date();
            assignment.updatedAt = new Date();
            assignment.user = orderWithMaxMargin.customerId
            await assignmentRepository.save(assignment);

            let notificationMessage = `Order #${item.orderNumber} (${item.orderName}) has been successfully assigned to you.`;

            io.emit('orderAssigned', { message: notificationMessage, userId: orderWithMaxMargin.id });

            const notification = notificationRepository.create({
              user: { id: orderWithMaxMargin.id },
              message: notificationMessage,
            });
            await notificationRepository.save(notification);

          }
        })
      }
    }
    catch (error) {
      console.error("Error Re-assigning order to User:", error);
    }
  }
}
