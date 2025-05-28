import { NextFunction, Request, Response } from "express";
import config from "config";
import { uploadDeltaInventory } from "./controller";

const basePath = config.get("BASE_PATH") || "/api/v1/";
const currentPath = "shopify";
const currentPathURL = basePath + currentPath;

export default [

  //  upload delta inventory to shopify  //
  {
    path: currentPathURL + "/uploadDeltaInventory",
    method: "post",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await uploadDeltaInventory(res, next);
        res.status(200).send(result);
      },
    ],
  },

];
