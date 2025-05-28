import { Response, NextFunction } from 'express';
import { CommonUtilities } from "../../utils/CommonUtilities";
import { User } from "../../db/User";
import { AppDataSource } from "../../utils/ormconfig";
import { MESSAGES } from "../../utils/messages";



//  get  user details for barcode  //
export const getUserDetails = async (token: any, res: Response, next: NextFunction) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);
    const userRepository = AppDataSource.getRepository(User);

    const user: any = await userRepository.findOneBy({ id: decoded.id, email: decoded.email.toLowerCase() });
    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_EXISTS,
      }));
    }
    delete user.password;

    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.SUCCESS,
      data: user,
    });
  } catch (error) {
    next(error)
  }
};

