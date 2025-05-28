import { NextFunction, Request, Response } from "express";
import config from "config";
import { deleteNotificationById, getNotifications } from "./controller";
import { checkAuthenticate } from "./middleware/check";

const basePath = config.get("BASE_PATH") || "/api/v1/";
const currentPath = "notifications";
const currentPathURL = basePath + currentPath;

export default [

  //  get all notification list  //
  {
    path: currentPathURL,
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getNotifications(req.get("Authorization"), req.query, res, next);
        res.status(200).send(result);
      },
    ],
  },

  //  delete notification by id  //
  {
    path: currentPathURL + "/:id",
    method: "delete",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await deleteNotificationById(req.get("Authorization"), req.params, res, next);
        res.status(200).send(result);
      },
    ],
  },

];
