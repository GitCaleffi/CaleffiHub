import jwt, { decode } from "jsonwebtoken";
import {
  HTTP400Error,
  HTTP404Error,
  HTTP403Error,
} from "../../utils/httpErrors";
import express, { Request, Response, NextFunction } from 'express';

import config from "config";
import { CommonUtilities } from "../../utils/CommonUtilities";
import * as bcrypt from "bcrypt";
import ejs from "ejs";
import moment from "moment";
import { User } from "../../db/User";
import { AppDataSource } from "../../utils/ormconfig";
import { MESSAGES } from "../../utils/messages";
import { MailerUtilities } from "../../utils/MailerUtilities";
import 'dotenv/config';



//  new user register api  //
export const register = async (bodyData: any, res: Response, next: NextFunction) => {
  try {
    const userRepository = AppDataSource.getRepository(User);

    // Check if user already exists
    const existingUser = await userRepository.findOneBy({ email: bodyData.email.toLowerCase(), isDeleted: false });
    if (existingUser) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_EXISTS,
      }));
    }

    const hashedPassword: any = await CommonUtilities.cryptPassword(bodyData.password);
    const customerId = await CommonUtilities.generateCustomerId(bodyData.email.toLowerCase(), bodyData.password);
    // const deviceId = await CommonUtilities.generateBarcode();
    let randomOTP = CommonUtilities.genNumericCode(6);

    const userObj = new User();
    userObj.email = bodyData.email.toLowerCase();
    userObj.password = hashedPassword;
    userObj.shopAddress = bodyData.shopAddress;
    userObj.customerId = customerId;
    // userObj.deviceId = deviceId;
    userObj.otp = randomOTP;
    userObj.companyName = bodyData.companyName;
    userObj.vat = bodyData.vat;
    userObj.street = bodyData.street;
    userObj.houseNumber = bodyData.houseNumber;
    userObj.zipCode = bodyData.zipCode;
    userObj.country = bodyData.country;
    userObj.city = bodyData.city;

    console.log('userObj ===== ', userObj);
    await AppDataSource.manager.save(userObj);

    // send account verification email 
    let messageHtml = await ejs.renderFile(
      process.cwd() + "/src/views/accountVerify.ejs",
      { link: process.env.accountVerifyBaseUrl + '?email=' + bodyData.email.toLowerCase() + '&otp=' + randomOTP + '&type=accountVerified' },
      { async: true }
    );
    let mailResponse = await MailerUtilities.sendSendgridMail({ recipient_email: [bodyData.email], subject: "Account Verify Link", text: messageHtml });

    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.ACCOUNT_VERIFY_LINK,
    });
  } catch (error) {
    next(error)
  }
};

//  login api  //
export const login = async (bodyData: any, res: Response, next: NextFunction) => {
  try {
    if (!bodyData.email || !bodyData.password) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.EMAIL_PASS_REQUIRED,
      }));
    }

    const userRepository = AppDataSource.getRepository(User);
    const user: any = await userRepository.findOneBy({ email: bodyData.email.toLowerCase(), isDeleted: false });

    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_NOT_EXISTS,
      }));
    }
    const passwordMatch = await bcrypt.compare(bodyData.password, user.password);
    if (!passwordMatch) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.INVALID_PASSWORD,
      }));
    }

    if (!user.accountVerified) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.ACCOUNT_NOT_VERIFIED,
      }));
    }

    let userToken = await CommonUtilities.createJWTToken({
      id: user.id,
      email: user.email,
      customerId: user.customerId
    });
    user.accessToken = userToken;
    await userRepository.save(user); // Saving the updated user

    delete user.password;
    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.LOGIN_SUCCESS,
      data: user
    });

  } catch (error) {
    next(error);
  }
};

//  verify account link  //
export const verifyAccountLink = async (query: any, res: Response, next: NextFunction) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user: any = await userRepository.findOneBy({ email: query.email.toLowerCase(), isDeleted: false });

    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.INVALID_LINK,
      }));
    }

    console.log('user.otp ====== ', user.otp);
    console.log('query.otp ====== ', query.otp);
    if (user.otp != query.otp) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.INVALID_LINK,
      }));
    }

    user.otp = 0;
    user.accountVerified = true;
    await userRepository.save(user); // Saving the updated user

    delete user.password;
    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.LINK_VERIFIED,
      data: user
    });
  } catch (error) {
    next(error);
  }
}

//  Forgot Password  //
export const forgotPassword = async (bodyData: any, res: Response, next: NextFunction) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user: any = await userRepository.findOneBy({ email: bodyData.email.toLowerCase(), isDeleted: false });

    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_NOT_EXISTS,
      }));
    }

    let randomOTP = CommonUtilities.genNumericCode(6);
    console.log('randomOTP >>>> ', randomOTP, process.env.passwordResetBaseUrl + '?id=' + user.id + '&otp=' + randomOTP + '&type=forgotpassword');

    // Get email template to send email
    let messageHtml = await ejs.renderFile(
      process.cwd() + "/src/views/forgotPassword.ejs",
      { link: process.env.passwordResetBaseUrl + '?id=' + user.id + '&otp=' + randomOTP + '&type=forgotpassword' },
      { async: true }
    );

    let mailResponse = await MailerUtilities.sendSendgridMail({ recipient_email: [bodyData.email], subject: "Forgot Password link", text: messageHtml });

    user['otp'] = randomOTP;
    user['otpVerified'] = false;
    user['otpExipredAt'] = moment().add(10, "m").toDate();
    await userRepository.save(user); // Saving the updated user

    return CommonUtilities.sendResponsData({
      code: 200,
      message: "Mail is sent with link",
    });
  } catch (error) {
    next(error);
  }
};

//  Verify Reset Link  //
export const verifyResetLink = async (params: any, query: any, res: Response, next: NextFunction) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user: any = await userRepository.findOneBy({ id: params.id, isDeleted: false });

    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.INVALID_LINK,
      }));
    }

    console.log('user.otp ====== ', user.otp);
    console.log('query.otp ====== ', query.otp);
    if (user.otp != query.otp) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.INVALID_LINK,
      }));
    }

    const expiryTime = moment(user.otpExipredAt); // Convert retrieved value
    const currentTime = moment();
    if (currentTime.isAfter(expiryTime)) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.LINK_EXPIRED,
      }));
    }

    user.otp = 0;
    user.otpVerified = true;
    await userRepository.save(user); // Saving the updated user

    delete user.password;

    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.LINK_VERIFIED,
      data: user
    });
  } catch (error) {
    next(error);
  }
}

//  Reset Password  //
export const resetPassword = async (bodyData: any, res: Response, next: any) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user: any = await userRepository.findOneBy({ email: bodyData.email.toLowerCase(), isDeleted: false });

    if (!user) {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.USER_NOT_EXISTS,
      }));
    }

    const pass = await CommonUtilities.cryptPassword(bodyData.password);

    let messageHtml = await ejs.renderFile(
      process.cwd() + "/src/views/changePassword.email.ejs",
      { async: true }
    );

    let mailResponse = await MailerUtilities.sendSendgridMail({ recipient_email: [user.email], subject: "Change Password", text: messageHtml });

    user.password = pass;
    await userRepository.save(user); // Saving the updated user

    delete user.password;

    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.PASSWORD_UPDATED,
      data: user
    });

  } catch (error) {
    next(error)
  }
};


