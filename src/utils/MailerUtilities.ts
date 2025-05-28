import config from "config";
import * as nodemailer from "nodemailer";
import { HTTP400Error, HTTP404Error, HTTP403Error } from "./httpErrors";
var sgTransport = require('nodemailer-sendgrid-transport');
import 'dotenv/config';

export class MailerUtilities {


    public static sendSendgridMail = async (data: any) => {
        console.log("inside sendSendgridMail function")
        var options = {
            auth: {
                api_key: process.env.SENDGRID_API_KEY
            }
        }

        var mailer = nodemailer.createTransport(sgTransport(options));

        var message: any = {
            to: [...data.recipient_email],
            cc: [process.env.SENDGRID_SENDER_EMAIL],
            from: process.env.SENDGRID_SENDER_EMAIL,
            subject: data.subject,
            text: data.text,
            html: data.text,
        };

        if (data.cc) {
            message.cc = [...data.cc]
        }

        if (data.attachments) {
            message.attachments = [
                {
                    filename: 'test.txt',
                    path: __dirname + '/test.txt'
                }
            ]
        }

        const mailRes = await mailer.sendMail(message);
        console.log("mailRes", mailRes);
        return mailRes;
    }


}