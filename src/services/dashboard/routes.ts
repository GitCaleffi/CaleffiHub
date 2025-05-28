import { NextFunction, Request, Response } from "express";
import config from "config";
import { getUserDetails } from "./controller";
import { checkAuthenticate } from "./middleware/check";

const basePath = config.get("BASE_PATH") || "/api/v1/";
const currentPath = "dashboard";
const currentPathURL = basePath + currentPath;

export default [

  //  get  user details for barcode  //
  {
    path: currentPathURL + "/userDetails",
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getUserDetails(req.get("Authorization"), res, next);
        res.status(200).send(result);
      },
    ],
  },


];
