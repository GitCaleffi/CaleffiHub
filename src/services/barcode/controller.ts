import { Response, NextFunction } from 'express';
import { CommonUtilities } from "../../utils/CommonUtilities";
import { User } from "../../db/User";
import { AppDataSource } from "../../utils/ormconfig";
import { MESSAGES } from "../../utils/messages";
import { TestBarcode } from '../../db/TestBarcode';
import { BarcodeScanLog } from '../../db/BarcodeScanLog';
// import { sendToIoTHub } from '../../utils/iotHubService';
import { v4 as uuidv4 } from "uuid"; // UUID for unique barcode generation
import { sendToIoTHub } from '../../utils/iotHubService';
import { Device } from '../../db/Device';



//  get Fixed Test Barcode  //
export const getTestBarcode = async () => {
  try {
    const testBarcodeRepository = AppDataSource.getRepository(TestBarcode);
    let barcode = await testBarcodeRepository.findOneBy({ isActive: true });

    if (!barcode) {
      const generatedBarcode = uuidv4().replace(/-/g, "").substring(0, 12); // Generate a 12-character barcode

      barcode = testBarcodeRepository.create({ barcode: generatedBarcode, isActive: true });
      await testBarcodeRepository.save(barcode);
    }

    return {
      code: 200,
      message: MESSAGES.TEST_BARCODE_RETRIVED,
      data: { barcode: barcode?.barcode },
    };
  } catch (error) {
    // next(error)
    throw error; // Throw error to be caught in handler

  }
};

//  Validate Scanned Barcode  //
export const validateScannedBarcode = async (token: any, bodydata: any, res: Response, next: NextFunction) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);
    const { scannedBarcode, deviceId } = bodydata;

    const user = await AppDataSource.getRepository(User).findOne({ where: { id: decoded.id } });
    const testBarcode = await AppDataSource.getRepository(TestBarcode).findOne({ where: { isActive: true } });
    const userDevice = await AppDataSource.getRepository(Device).findOne({ where: { user: decoded.id, deviceId: deviceId } });
    console.log('userDevice >>>>>>>>>>>>>. ', userDevice);


    if (!user || !testBarcode) {
      return res.status(404).json(CommonUtilities.sendResponsData({
        code: 404,
        message: MESSAGES.USER_BARCODE_NOT_FOUND,
      }));
    }

    // Log scanned barcode
    await AppDataSource.getRepository(BarcodeScanLog).save({ user, scannedBarcode });

    if (scannedBarcode === testBarcode.barcode) {

      return CommonUtilities.sendResponsData({
        code: 200,
        message: MESSAGES.BARCODE_VERIFIED,
      });
    } else {
      return res.status(400).json(CommonUtilities.sendResponsData({
        code: 400,
        message: MESSAGES.BARCODE_MISMATCHED,
      }));
    }
  } catch (error) {
    next(error)
  }
};



//  TEST API to send barcode to Auzure IOThub  //
export const sendDeviceIdToIoTHub = async (token: any, bodydata: any, res: Response, next: NextFunction) => {
  try {
    const decoded: any = await CommonUtilities.getDecoded(token);
    const { scannedBarcode, deviceId, sku } = bodydata;

    const user = await AppDataSource.getRepository(User).findOne({ where: { id: decoded.id } });
    // const testBarcode = await AppDataSource.getRepository(TestBarcode).findOne({ where: { isActive: true } });

    // if (!user || !testBarcode) {
    //   return res.status(404).json(CommonUtilities.sendResponsData({
    //     code: 404,
    //     message: MESSAGES.USER_BARCODE_NOT_FOUND,
    //   }));
    // }

    // if (scannedBarcode === testBarcode.barcode) {
    // Send barcode data to IoT Hub
    await sendToIoTHub(deviceId, scannedBarcode, sku);

    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.BARCODE_SENDTO_IOT,
    });
    // } else {
    //   return res.status(400).json(CommonUtilities.sendResponsData({
    //     code: 400,
    //     message: MESSAGES.BARCODE_MISMATCHED,
    //   }));
    // }
  } catch (error) {
    next(error)
  }
};
