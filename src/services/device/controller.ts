import { Response, NextFunction } from 'express';
import { CommonUtilities } from "../../utils/CommonUtilities";
import { User } from "../../db/User";
import { AppDataSource } from "../../utils/ormconfig";
import { MESSAGES } from "../../utils/messages";
import { Device } from '../../db/Device';



//  get devices list for barcode  //
export const getDeviceList = async (token: any, queryData: any, res: Response, next: NextFunction) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);
    const userRepository = AppDataSource.getRepository(User);

    const user: any = await userRepository.findOneBy({ id: decoded.id, email: decoded.email.toLowerCase() });
    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_NOT_FOUND,
      }));
    }

    const deviceRepository = AppDataSource.getRepository(Device);
    const limit = queryData?.limit || 10;
    const page = queryData?.page || 1;

    const [devices, total] = await deviceRepository.findAndCount({
      where: { user: { id: decoded.id } }, // Filter by userId
      skip: (page - 1) * limit, // Skip records based on pagination
      take: limit, // Number of records per page
      order: { id: "DESC" }, // Sort by latest devices
    });    

    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.SUCCESS,
      data: devices,
      totalRecord: total,
    });
  } catch (error) {
    next(error)
  }
};

//  add new devices for barcode  //
export const addDevice = async (token: any, res: Response, next: NextFunction) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);
    const userRepository = AppDataSource.getRepository(User);

    const user: any = await userRepository.findOneBy({ id: decoded.id, email: decoded.email.toLowerCase() });
    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_NOT_FOUND,
      }));
    }

    const deviceRepository = AppDataSource.getRepository(Device);
    const deviceId = await CommonUtilities.generateBarcode();

    const newDevice = deviceRepository.create({
      user,
      customerId: user.customerId,
      deviceId,
      verified: false,
      isDeleted: false,
    });
    const data = await deviceRepository.save(newDevice);      

    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.NEW_DEVICE_ADDED,
      data: newDevice,
    });
  } catch (error) {
    next(error)
  }
};

