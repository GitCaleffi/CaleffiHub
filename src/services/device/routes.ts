import { NextFunction, Request, Response } from "express";
import config from "config";
import { addDevice, getDeviceList } from "./controller";
import { checkAuthenticate } from "./middleware/check";

const basePath = config.get("BASE_PATH") || "/api/v1/";
const currentPath = "device";
const currentPathURL = basePath + currentPath;

export default [

  //  get devices list for barcode  //
  {
    path: currentPathURL + "/list",
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getDeviceList(req.get("Authorization"), req.query, res, next);
        res.status(200).send(result);
      },
    ],
  },

  //  add new devices for barcode  //
  {
    path: currentPathURL + "/add",
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await addDevice(req.get("Authorization"), res, next);
        res.status(200).send(result);
      },
    ],
  },


];
