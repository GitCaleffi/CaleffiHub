import jwt from "jsonwebtoken";
import config from "config";
import * as bcrypt from "bcrypt";
import * as nodemailer from "nodemailer";
import { HTTP400Error, HTTP404Error, HTTP403Error } from "./httpErrors";
import { invalidTokenError } from "./ErrorHandler";
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from "./ormconfig";
import { User } from "../db/User";


export class CommonUtilities {

  /****  Return response in custom format  ******/
  public static sendResponsData(response: any) {
    let result: any = {
      responseCode: response.code,
      responseMessage: response.message,
    };
    if (response.data) {
      result.data = response.data;
    }
    if (response.totalRecord) {
      result.totalRecord = response.totalRecord;
    }
    return result;
  }

  /****  Generate encrypted password  *******/
  public static cryptPassword = async (password: string) => {
    return new Promise(function (resolve, reject) {
      return bcrypt.hash(
        password,
        config.get("SALT"),
        (err: any, hash: any) => {
          if (err) {
            return reject(err);
          } else {
            return resolve(hash);
          }
        }
      );
    });
  };

  /****  Verify password  *******/
  public static VerifyPassword = async (password: string, hash: string) => {
    return new Promise(function (resolve, reject) {
      return bcrypt.compare(password, hash, (error: any, result: any) => {
        if (error) {
          return reject(error);
        } else {
          return resolve(result);
        }
      });
    });
  };

  /****  Generate customerId  *****/
  public static generateCustomerId = async (email: string, password: string) => {
    const salt = randomBytes(4).toString('hex'); // Random 4-byte salt
    const data = `${email}:${password}:${salt}`;

    const hash = createHash('sha256').update(data).digest('hex'); // Get full hash

    // Convert hash to a numeric value and take the first 6 digits
    const numericId = parseInt(hash.substring(0, 10), 16) % 1000000; // Keep 6 digits

    return numericId.toString().padStart(6, '0'); // Ensure 6 digits
  };

  /****  Generate UUID-Based Device ID as barcode  *****/
  public static generateBarcode = async () => {
    return uuidv4().replace(/-/g, '').substring(0, 12); // 12-char barcode

  };

  /****  Create jwt token  *****/
  public static createJWTToken = async (payload: any) => {
    const secretKey = config.get("JWT_SECRET_KEY");
    if (typeof secretKey !== 'string') {
      throw new Error('JWT_SECRET_KEY is not defined or not a string');
    }

    return jwt.sign(payload, secretKey, {});
  };

  /****  Verify token is valid or not  ******/
  public static verifyToken = async (token: any) => {
    return new Promise(function (resolve, reject) {
      jwt.verify(
        token,
        config.get("JWT_SECRET_KEY"),
        async function (error: any, result: any) {
          if (error) {
            return reject(error);
          } else {
            const userRepository = AppDataSource.getRepository(User);
            const userRes = await userRepository.findOneBy({ accessToken: token });
            if (userRes) {
              return resolve(result);
            } else {
              return reject({ message: "Invalid Token" });
            }
          }
        }
      );
    })
  };

  /**
   * decoded jwt token
   * @param token string
   */
  public static getDecoded = async (token: any) => {
    return jwt.decode(token);
  };

  /**
   * check Super admin or sub admin
   * @param token string
   */
  public static isAdmin = async (token: any) => {
    const decoded: any = await CommonUtilities.getDecoded(token);

    if (
      decoded.user_type === "Super-Admin" ||
      decoded.user_type === "Sub-Admin"
    )
      return true;
    return false;
  };

  /**
   * Generate alphanumer random string of given length
   * @param length
   */
  public static genAlphaNumericCode(length: number) {
    var result = "";
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  /**
   * 
   * @param length of otp we want to generate
   * @returns numeric code for specified length
   */
  public static genNumericCode(length: number) {
    let min = Math.pow(10, length - 1);
    let max = (Math.pow(10, length) - Math.pow(10, length - 1) - 1);
    return Math.floor(min + Math.random() * max)
  }

}
