import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Phone number validation middleware
export const validatePhoneNumber = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    phone: Joi.string()
      .trim()
      .pattern(/^\d{10}$/)
      .required()
      .messages({
        'string.empty': 'Phone number cannot be empty',
        'string.pattern.base': 'Phone number must be a 10-digit number',
      }),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const messageArr = error.details.map(detail => detail.message);
    return res.status(400).json({ message: messageArr.join(', ') });
  } else {
    req.body = value;
    next();
  }
};

export const validateOTP = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    otp: Joi.string()
      .trim()
      .pattern(/^\d{4}$/) 
      .required()
      .messages({
        'string.empty': 'OTP cannot be empty',
        'string.pattern.base': 'OTP must be a 6-digit number',
      }),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const messageArr = error.details.map(detail => detail.message);
    return res.status(400).json({ message: messageArr.join(', ') });
  } else {
    req.body = value;
    next();
  }
};
