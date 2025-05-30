import { Response, NextFunction } from 'express';
import { CommonUtilities } from "../../utils/CommonUtilities";
import { User } from "../../db/User";
import { AppDataSource } from "../../utils/ormconfig";
import { MESSAGES } from "../../utils/messages";
import { Device } from '../../db/Device';
import { In } from 'typeorm';
import { Order } from '../../db/Order';
import axios from 'axios';
import 'dotenv/config';
import { OrdersAssignment, AssignmentStatus } from "../../db/OrderAssignment";
import { Inventory } from '../../db/Inventory';
import pLimit from 'p-limit';
const limitConcurrency = pLimit(5); // Limit to 5 concurrent requests to respect rate limits
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const LOCATION_ID = process.env.LOCATION_ID
const BASE_URL = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2024-10`;
// // update Inventory Quantity
// export const updateInventoryQuantity = async (bodyData: any, res: Response, next: NextFunction) => {
//   try {
//     const orderRepository = AppDataSource.getRepository(Order);
//     const order: any = await orderRepository.findOneBy({ deviceId: bodyData.deviceId, sku: bodyData.sku });

//     if (!order) {
//       const newOrder = orderRepository.create({
//         deviceId: bodyData.deviceId,
//         sku: bodyData.sku,
//         consumedQuantity: 1,
//       });
//       await orderRepository.save(newOrder);
//     }
//     else {
//       order.consumedQuantity += 1;
//       await orderRepository.save(order);
//     }
//     console.log('************************');


//     return CommonUtilities.sendResponsData({
//       code: 200,
//       message: MESSAGES.SUCCESS,
//     });
//   } catch (error) {
//     next(error)
//   }
// };

//  get Orders  //
export const getOrders = async (token: any, queryData: any, res: Response, next: NextFunction) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);
    const userRepository = AppDataSource.getRepository(User);
    const user: any = await userRepository.findOneBy({ id: decoded.id, email: decoded.email.toLowerCase() });
    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_NOT_EXISTS,
      }));
    }

    const deviceRepository = AppDataSource.getRepository(Device);
    const veriviedDeviceList = await deviceRepository.find({
      where: {
        user: { id: decoded.id },
        verified: true,
      },
    });

    if (!veriviedDeviceList?.length) {
      return CommonUtilities.sendResponsData({
        code: 200,
        message: MESSAGES.SUCCESS,
        data: [],
        totalRecord: 0,
      });
    }
    else {
      const deviceIds = veriviedDeviceList.map(device => device.deviceId);
      const orderRepository = AppDataSource.getRepository(Order);
      const limit = queryData?.limit || 10;
      const page = queryData?.page || 1;

      const [orderList, total] = await orderRepository.findAndCount({
        where: { deviceId: In(deviceIds) }, // Filter
        skip: (page - 1) * limit, // Skip records based on pagination
        take: limit, // Number of records per page
        order: { id: "DESC" }, // Sort by latest
      });

      return CommonUtilities.sendResponsData({
        code: 200,
        message: MESSAGES.SUCCESS,
        data: orderList,
        totalRecord: total,
      });

    }
  } catch (error) {
    next(error)
  }
};

export const getShopifyOrders = async (token: any, queryData: any, res: Response, next: NextFunction) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);

    const userRepository = AppDataSource.getRepository(User);
    const user: any = await userRepository.findOneBy({ id: decoded.id, email: decoded.email.toLowerCase() });

    if (!user) {
      return res.status(400).json(
        CommonUtilities.sendResponsData({
          code: 400,
          message: MESSAGES.USER_NOT_EXISTS,
        })
      );
    }

    const assignmentRepository = AppDataSource.getRepository(OrdersAssignment);

    const limit = parseInt(queryData?.limit) || 10;
    const page = parseInt(queryData?.page) || 1;

    const [assignmentList, total] = await assignmentRepository.findAndCount({
      where: { user: decoded.customerId.toString() }, // user is stored as string
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: "DESC" },
    });

    console.log(assignmentList, ">>> assingment List >>>>")
    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.SUCCESS,
      data: assignmentList,
      totalRecord: total,
    })
  } catch (error) {
    next(error);
  }
};

export const updateShopifyOrderStatus = async (
  token: any,
  assignmentId: string,
  newStatus: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);

    const userRepository = AppDataSource.getRepository(User);
    const user: any = await userRepository.findOneBy({
      id: decoded.id,
      email: decoded.email.toLowerCase(),
    });

    if (!user) {
      return res.status(400).json(
        CommonUtilities.sendResponsData({
          code: 400,
          message: MESSAGES.USER_NOT_EXISTS,
        })
      );
    }

    const assignmentRepository = AppDataSource.getRepository(OrdersAssignment);
    const assignment = await assignmentRepository.findOneBy({ id: Number(assignmentId) });

    if (!assignment) {
      return res.status(404).json(
        CommonUtilities.sendResponsData({
          code: 404,
          message: "Order not found",
        })
      );
    }

    if (![AssignmentStatus.ACCEPTED, AssignmentStatus.REJECTED, AssignmentStatus.SHIPPED, AssignmentStatus.PREPARED].includes(newStatus)) {
      return res.status(400).json(
        CommonUtilities.sendResponsData({
          code: 400,
          message: "Invalid status value. Must be 'accepted' or 'rejected' or 'shipped' or 'prepared'.",
        })
      );
    }

    assignment.status = newStatus as AssignmentStatus;
    await assignmentRepository.save(assignment);

    if (newStatus == AssignmentStatus.ACCEPTED || newStatus == AssignmentStatus.SHIPPED || newStatus == AssignmentStatus.PREPARED) {
      let nextUrl = `${BASE_URL}/orders/${assignment.orderId}.json`
      let response: any = await axios.get(nextUrl, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      let COD = 0;

      if (response?.data?.order && response?.data?.order?.line_items && response?.data?.order?.line_items.length > 0) {
        COD = response.data.order.line_items.reduce((total: any, item: any) => {
          const itemPrice = parseFloat(item.price) * item.quantity;
          const totalDiscount = item.discount_allocations.reduce(
            (sum: any, discount: any) => sum + parseFloat(discount.amount),
            0
          );
          return total + (itemPrice - totalDiscount);
        }, 0);
      }

      let obj = {
        status: assignment.status,
        province: user?.provinceCode || "",
        city: user?.city || "",
        addr: user?.shopAddress || "",
        email: user?.email,
        phone: user?.phone,
        country_code: user?.country || "",
        order_id: response?.data?.order?.id,
        cap: user?.zipCode || "",
        COD: COD,
        ragione_sociale: user?.companyName || "",
        customer_code: user?.customerId,
        VAT: user?.vat || "",
      };

      console.log(obj, ">>> obj")
      const webHookresponse: any = await axios.post(
        `https://webhooks.getmesa.com/v1/caleffispa/trigger-webhook/6825db886f5000c73805c484/6825dbb774b300540009fd58.json?apikey=7qZC4WMGSn4O30Zh3WUWc2NoaExDitxV7DssJQXX`,
        {
          obj,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(webHookresponse, ">>> webHookresponse")
    }

    return res.status(200).json(
      CommonUtilities.sendResponsData({
        code: 200,
        message: "Order status updated successfully",
        data: assignment,
      })
    );
  } catch (error) {
    console.error("Error updating assignment status:", error);
    return next(error);
  }
};

export const assignOrderToLocation = async (token: any, req: any, res: Response, next: NextFunction) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);
    const userRepository = AppDataSource.getRepository(User);
    const assignmentRepo = AppDataSource.getRepository(OrdersAssignment);

    const user = await userRepository.findOneBy({ id: decoded.id, email: decoded.email.toLowerCase() });
    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_NOT_EXISTS,
      }));
    }

    if (!SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN) {
      throw new Error('Shopify credentials are not configured properly');
    }

    // inventory start start 

    const inventoryRepository = AppDataSource.getRepository(Inventory);

    // Get all Inventory Data
    const [inventoryList, total] = await inventoryRepository.findAndCount({
      where: { user: { id: decoded.id } },
      relations: ["user"],
      order: { updatedAt: "DESC" },
    });

    const matchedOrders: any[] = [];


    let testData = []

    if (inventoryList && inventoryList.length > 0) {
      for (const item of inventoryList) {
        const { prezzoVendita, costoArticoli, sku, user }: any = item;

        console.log(user, ">>> inventory Data >>>>")

        let temp: any[] = [];
        let marginCount = 0;

        const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2023-10/orders.json?sku=${sku}`;

        const response = await axios.get(url, {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        });

        const orders = response.data.orders || [];
        testData = orders;
        for (const order of orders) {
          console.log(order, ">>> order >>>>")
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
    }
    // inventory section end
    const topOrder = matchedOrders.reduce((maxItem, currentItem) => {
      return currentItem.margin > maxItem.margin ? currentItem : maxItem;
    }, matchedOrders[0]);
    console.log(topOrder, ">>> topOrder >>>>")

    // order logic here

    let url = `${BASE_URL}/orders.json?fulfillment_status=unfulfilled`;
    // if(LOCATION_ID) {
    //   url += `?location_id=${LOCATION_ID}`
    // }

    let orders: any[] = [];
    let nextUrl = url;

    // Fetch all orders (using pagination)
    while (nextUrl) {
      console.log(nextUrl)
      const response = await axios.get(nextUrl, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const currentOrders = response.data.orders || [];
      orders = [...orders, ...currentOrders];

      const linkHeader = response.headers.link;
      const matches = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = matches?.[1] || null;

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Fetch fulfillment orders and add location_id
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
                location_id: openFulfillmentOrders[0].assigned_location_id, // Use the first open fulfillment order's location_id
                fulfillment_orders: openFulfillmentOrders, // Optional: include fulfillment orders for reference
              };
            }
            return order; // Return original order if no open fulfillment orders
          } catch (error: any) {
            console.error(`Error fetching fulfillment for order ${order.id}:`, error.response?.data || error.message);
            return order; // Return original order on error
          }
        })
      )
    );

    // Filter orders by fulfillment location_id (unchanged from original)
    // let filteredOrders = enrichedOrders;

    const filteredOrders = enrichedOrders.filter((order) =>
      order.fulfillment_orders?.some((fo: any) => fo.assigned_location_id === 106579198277)
    );

    for (const item of filteredOrders) {
      const { id, total_price, customer, email, name, financial_status, order_number, phone } = item;

      let address = ""
      address += customer.default_address.address1 ? customer.default_address.address1 : "";
      address += customer.default_address.city ? customer.default_address.city : "";
      address += customer.default_address.zip ? customer.default_address.zip : "";
      address += customer.default_address.province ? customer.default_address.province : "";
      address += customer.default_address.country ? customer.default_address.country : "";

      const existingAssignment = await assignmentRepo.findOneBy({ orderId: id });

      if (existingAssignment) {
        console.log(`Skipped existing orderId: ${id}`);
        continue;
      }

      const assignment = assignmentRepo.create({
        orderId: id,
        status: AssignmentStatus.PENDING,
        user: (topOrder.customerId).toString() || (decoded.id).toString(),
        amount: total_price,
        location_id: LOCATION_ID,
        name: customer.first_name ? (customer.first_name + "") : "" + customer.last_name ? customer.last_name : "",
        email: customer.email ? customer.email : "",
        phone: customer.phone ? customer.phone : "",
        orderNumber: order_number,
        orderName: name,
        billingAddress: address,
        sku: topOrder.sku
      });

      await assignmentRepo.save(assignment);
      console.log(`Inserted orderId: ${id}`);
    }

    return CommonUtilities.sendResponsData({
      code: 200,
      message: "Order successfully assigned to location",
      data: filteredOrders,
    });
  } catch (error: any) {
    if (error.response) {
      return CommonUtilities.sendResponsData({
        code: error.response.status || 500,
        message: error.response.data?.errors || "Failed to assign order to location",
        data: [],
      });
    } else {
      return next(error);
    }
  }
};