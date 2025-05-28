import { NextFunction, Request, Response } from "express";
import config from "config";
import { assignOrderToLocation, getOrders, getShopifyOrders, updateShopifyOrderStatus } from "./controller";
import { checkAuthenticate } from "./middleware/check";

const basePath = config.get("BASE_PATH") || "/api/v1/";
const currentPath = "orders";
const currentPathURL = basePath + currentPath;

export default [

  //  update Inventory quantity  //
  // {
  //   path: currentPathURL + "/updateQuantity",
  //   method: "put",
  //   handler: [
  //     checkAuthenticate,
  //     async (req: Request, res: Response, next: NextFunction) => {
  //       const result = await updateInventoryQuantity(req.body, res, next);
  //       res.status(200).send(result);
  //     },
  //   ],
  // },

  //  get all orders list  //
  {
    path: currentPathURL,
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getOrders(req.get("Authorization"), req.query, res, next);
        res.status(200).send(result);
      },
    ],
  },

  //  get Shopify orders  //
  {
    path: currentPathURL + "/shopify",
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const result = await getShopifyOrders(req.get("Authorization"),req.query, res, next);
          res.status(200).send(result);
        } catch (error) {
          next(error);
        }
      },
    ],
  },
  {
    path: currentPathURL + "/shopify/status/:id",
    method: "put",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const result = await updateShopifyOrderStatus(
            req.get("Authorization"),
            req.params.id,
            req.body.status,
            res,
            next
          );
          res.status(200).send(result);
        } catch (error) {
          next(error);
        }
      },
    ],
  },
  {
    path: currentPathURL + "/shopify/assign-order",
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const result = await assignOrderToLocation(req.get("Authorization"), req, res, next);
          res.status(200).send(result);
        } catch (error) {
          next(error);
        }
      },
    ],
  },
];
