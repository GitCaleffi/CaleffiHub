import { NextFunction, Request, Response } from "express";
import config from "config";
import { getInventory, uploadInventoryCsv } from "./controller";
import { checkAuthenticate } from "./middleware/check";

const basePath = config.get("BASE_PATH") || "/api/v1/";
const currentPath = "inventory";
const currentPathURL = basePath + currentPath;

export default [

  //  get all Inventory list  //
  {
    path: currentPathURL,
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getInventory(req.get("Authorization"), req.query, res, next);
        res.status(200).send(result);
      },
    ],
  },

  //  upload Inventory csv  //
  {
    path: currentPathURL + "/uploadCsv",
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await uploadInventoryCsv(req.get("Authorization"), req.body, res, next);
        res.status(200).send(result);
      },
    ],
  },

];
