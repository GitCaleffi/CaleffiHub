import { Response, NextFunction } from 'express';
import { CommonUtilities } from "../../utils/CommonUtilities";
import { User } from "../../db/User";
import { AppDataSource } from "../../utils/ormconfig";
import { MESSAGES } from "../../utils/messages";
import { Inventory } from '../../db/Inventory';
import { Device } from '../../db/Device';
import { lastDeviceActivity } from '../../utils/subscribeToIoTHub';
import axios from 'axios';
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
//  get Inventory list  //
export const getAnalytics = async (token: any, queryData: any, res: Response, next: NextFunction) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);
    const userRepository = AppDataSource.getRepository(User);
    const user: any = await userRepository.findOneBy({ id: decoded.id, email: decoded.email.toLowerCase() });
    const limit = queryData?.limit || 10;
    const page = queryData?.page || 1;

    const startDate = queryData?.start ? new Date(queryData.start) : null;
    const endDate = queryData?.end ? new Date(queryData.end) : null;

    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_NOT_EXISTS,
      }));
    }

    const inventoryRepository = AppDataSource.getRepository(Inventory);

    // Get all Inventory Data
    const [inventoryList, total] = await inventoryRepository.findAndCount({
      where: { user: { id: decoded.id } },
      order: { updatedAt: "DESC" },
    });

    const matchedOrders: any[] = [];


    let testData = []

    if (inventoryList && inventoryList.length > 0) {
      for (const item of inventoryList) {
        const { prezzoVendita, costoArticoli, sku }: any = item;
        
        console.log(item,">>> inventory Data  1>>>>")

        let temp: any[] = [];
        let marginCount = 0;

        let total_amount_cal= 0;
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
          console.log(order,">>> order 1>>>>")
          const matchingItem = order.line_items?.find((lineItem: any) => parseInt(lineItem.sku) == parseInt(sku));
          if (matchingItem) {
            const orderCreatedAt = new Date(order.created_at);

            const isInRange =
              (!startDate || orderCreatedAt >= startDate) &&
              (!endDate || orderCreatedAt <= endDate);

            if (!isInRange) continue;

            const totalAmount = parseFloat(order.total_price || '0');
            total_amount_cal+= totalAmount
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
            total_amount: total_amount_cal,
            margin: marginCount,
            prezzo_vendita: prezzoVendita,
            costoArticoli: costoArticoli
          });
        }
      }
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = matchedOrders.slice(startIndex, endIndex);

    return res.status(200).json(CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.SUCCESS,
      data: paginatedOrders,
      totalRecord: matchedOrders.length,
      currentPage: page,
      totalPages: Math.ceil(matchedOrders.length / limit)
    }));
  } catch (error) {
    next(error);
  }
};

