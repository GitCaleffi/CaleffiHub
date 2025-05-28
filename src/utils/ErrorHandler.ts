import { Response, NextFunction } from "express";
import { HTTPClientError, HTTP404Error, HTTP403Error, HTTP400Error } from "./httpErrors";

export const notFoundError = () => {
  throw new HTTP404Error({responseCode:404,responseMessage:"Method not found."});
};

export const clientError = (err: Error, res: Response, next: NextFunction) => {
  if (err instanceof HTTPClientError) {
    console.warn(err);
    res.status(err.statusCode).send(err.message);
  } else {
    next(err);
  }
};

export const serverError = (err: Error, res: Response, next: NextFunction) => {
  console.error(err);
  if (process.env.NODE_ENV === "production") {
    res.status(500).send("Internal Server Error");
  } else {
    res.status(500).send(err.stack);
  }
};

export const invalidTokenError = () => {
  throw new HTTP403Error({responseCode:403,responseMessage:"Invalid Token", data:{}});
}

export const defaultError = (message: any) => {
  throw new HTTP400Error({responseCode:400,responseMessage: message? message :"Failed", data:{}});
}

export const errorMessageHander =  (data:any) => {
  let errorArr:any = [];
  Object.keys(data).forEach(function(key) {
      errorArr.push(data[key].message);
  });
  return errorArr;
};
