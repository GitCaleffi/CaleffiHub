import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import config from "config";
import { CommonUtilities } from '../../../utils/CommonUtilities';

export const checkAuthenticate = (req: any, res: Response, next: NextFunction) => {
  const token: any = req.get(config.get("AUTHORIZATION"));
  CommonUtilities.verifyToken(token)
    .then((result) => {
      req.user = result;
      next();
    })
    .catch((error) => {
      res.status(403)
        .send({ responseCode: 401, responseMessage: error.message, data: {} });
    });
};
