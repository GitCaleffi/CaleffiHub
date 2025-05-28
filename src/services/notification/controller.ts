import { Response, NextFunction } from 'express';
import { CommonUtilities } from "../../utils/CommonUtilities";
import { User } from "../../db/User";
import { AppDataSource } from "../../utils/ormconfig";
import { MESSAGES } from "../../utils/messages";
import { Notification } from '../../db/Notification';
import 'dotenv/config';


//  get notification list  //
export const getNotifications = async (token: any, queryData: any, res: Response, next: NextFunction) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);
    const userRepository = AppDataSource.getRepository(User);
    const user: any = await userRepository.findOneBy({ id: decoded.id, email: decoded.email.toLowerCase(), isDeleted: false });
    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_NOT_EXISTS,
      }));
    }

    const notificationRepository = AppDataSource.getRepository(Notification);
    const limit = queryData?.limit || 10;
    const page = queryData?.page || 1;

    const [notificationList, total] = await notificationRepository.findAndCount({
      where: { user: { id: decoded.id }, isDeleted: false }, // Filter
      relations: ['user'],
      skip: (page - 1) * limit, // Skip records based on pagination
      take: limit, // Number of records per page
      order: { createdAt: "DESC" }, // Sort by latest
    });

    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.SUCCESS,
      data: notificationList,
      totalRecord: total,
    });

  } catch (error) {
    next(error)
  }
};

export const deleteNotificationById = async (token: any, params: any, res: Response, next: NextFunction) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);
    const userRepository = AppDataSource.getRepository(User);
    const user: any = await userRepository.findOneBy({ id: decoded.id, email: decoded.email.toLowerCase(), isDeleted: false });
    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_NOT_EXISTS,
      }));
    }

    const notificationRepository = AppDataSource.getRepository(Notification);
    const notification: any = await notificationRepository.findOneBy({ id: params.id, isDeleted: false });
    if (!notification) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.NOTIFICATION_NOT_EXISTS,
      }));
    }
    notification.isDeleted = true;
    const data = await notificationRepository.save(notification);

    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.NOTIFICATION_DELETED,
    });
  }
  catch (error) {
    next(error)
  }
};

