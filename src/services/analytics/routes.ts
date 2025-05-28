import { NextFunction, Request, Response } from "express";
import config from "config";
import { getAnalytics } from "./controller";
import { checkAuthenticate } from "./middleware/check";

const basePath = config.get("BASE_PATH") || "/api/v1/";
const currentPath = "analytics";
const currentPathURL = basePath + currentPath;

export default [
  //  get all Inventory list  //
  {
    path: currentPathURL,
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getAnalytics(req.get("Authorization"), req.query, res, next);
        res.status(200).send(result);
      },
    ],
  },

];
