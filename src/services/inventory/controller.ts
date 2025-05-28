import { Response, NextFunction } from 'express';
import { CommonUtilities } from "../../utils/CommonUtilities";
import { User } from "../../db/User";
import { AppDataSource } from "../../utils/ormconfig";
import { MESSAGES } from "../../utils/messages";
import { Inventory } from '../../db/Inventory';
import { Device } from '../../db/Device';
import { lastDeviceActivity } from '../../utils/subscribeToIoTHub';


//  get Inventory list  //
export const getInventory = async (token: any, queryData: any, res: Response, next: NextFunction) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);
    console.log(decoded,">>> decoded >>>")
    const userRepository = AppDataSource.getRepository(User);
    const user: any = await userRepository.findOneBy({ id: decoded.id, email: decoded.email.toLowerCase() });
    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_NOT_EXISTS,
      }));
    }

    const inventoryRepository = AppDataSource.getRepository(Inventory);
    const limit = queryData?.limit || 10;
    const page = queryData?.page || 1;

    const [inventoryList, total] = await inventoryRepository.findAndCount({
      where: { user: { id: decoded.id } }, // Filter by userId
      skip: (page - 1) * limit, // Skip records based on pagination
      take: limit, // Number of records per page
      order: { updatedAt: "DESC" }, // Sort by latest
    });

    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.SUCCESS,
      data: inventoryList,
      totalRecord: total,
    });
  } catch (error) {
    next(error)
  }
};

//  upload Inventory CSV  //
export const uploadInventoryCsv = async (token: any, bodyData: any, res: Response, next: NextFunction) => {
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

    const inventoryRepository = AppDataSource.getRepository(Inventory);

    for (const item of bodyData?.data) {
      const { sku, totalQuantity, prezzoVendita, costoArticoli, iva } = item;

      // Check if SKU exists for this user
      let inventoryItem = await inventoryRepository.findOne({
        where: { sku, user: { id: decoded.id } },
        relations: ["user"], // Ensure user relation is loaded
      });

      if (inventoryItem) {
        inventoryItem.totalQuantity = totalQuantity;
        inventoryItem.prezzoVendita = prezzoVendita || '';
        inventoryItem.costoArticoli = costoArticoli || '';
        inventoryItem.iva = iva || '';
        await inventoryRepository.save(inventoryItem);
        console.log(`Updated SKU: ${sku} for user: ${decoded.id}`);
      }
      else {
        inventoryItem = inventoryRepository.create({
          sku,
          totalQuantity,
          prezzoVendita: prezzoVendita || '',
          costoArticoli: costoArticoli || '',
          iva: iva || '',
          user,
        });
        await inventoryRepository.save(inventoryItem);
        console.log(`Created new SKU: ${sku} for user: ${decoded.id}`);
      }
    }

    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.CSV_UPLOADED,
    });
  } catch (error) {
    next(error)
  }
};
