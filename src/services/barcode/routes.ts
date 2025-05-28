import { NextFunction, Request, Response } from "express";
import config from "config";
import { getTestBarcode, sendDeviceIdToIoTHub, validateScannedBarcode } from "./controller";
import { checkAuthenticate } from "./middleware/check";

const basePath = config.get("BASE_PATH") || "/api/v1/";
const currentPath = "barcode";
const currentPathURL = basePath + currentPath;

export default [

  //  get Fixed Test Barcode  //
  {
    path: currentPathURL + "/getTestBarcode",
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const result = await getTestBarcode();
          res.status(result.code).json(result); // Send the response here

          // res.status(200).send(result);
        } catch (error) {
          next(error);
        }
      },
    ],
  },

  //  Validate Scanned Barcode  //
  {
    path: currentPathURL + "/validateScannedBarcode",
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await validateScannedBarcode(req.get("Authorization"), req.body, res, next);
        res.status(200).send(result);
      },
    ],
  },


  

  //  TEST API to send barcode and deviceId to Auzure IOThub  //
  {
    path: currentPathURL + "/sendDeviceIdToIoTHub",
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await sendDeviceIdToIoTHub(req.get("Authorization"), req.body, res, next);
        res.status(200).send(result);
      },
    ],
  },



];
