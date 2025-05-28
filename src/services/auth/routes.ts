import { NextFunction, Request, Response } from "express";
import config from "config";
import { forgotPassword, login, register, resetPassword, verifyAccountLink, verifyResetLink } from "./controller";  // Ensure this function is properly implemented

const basePath = config.get("BASE_PATH") || "/api/v1/";
const currentPath = "auth";
const currentPathURL = basePath + currentPath;

export default [

  //  signup  //
  {
    path: currentPathURL + "/signup",
    method: "post",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await register(req.body, res, next);
        res.status(200).send(result);
      },
    ],
  },

  //  login  //
  {
    path: currentPathURL + "/login",
    method: "post",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await login(req.body, res, next);
        res.status(200).send(result);
      },
    ],
  },

  //  verify account link  //
  {
    path: currentPathURL + '/verifyAccount',
    method: "get",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await verifyAccountLink(req.query, res, next);
        res.status(200).send(result);
      },
    ],
  },

  //  forgot Password  //
  {
    path: currentPathURL + '/forgotPassword',
    method: "post",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await forgotPassword(req.body, res, next);
        res.status(200).send(result);
      },
    ],
  },

  //  verify forgot Password link  //
  {
    path: currentPathURL + '/resetLink/:id',
    method: "get",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await verifyResetLink(req.params, req.query, res, next);
        res.status(200).send(result);
      },
    ],
  },

  // reset password  //
  {
    path: currentPathURL + '/resetPassword',
    method: "put",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await resetPassword(req.body, res, next);
        res.status(200).send(result);
      },
    ],
  },


];
