import { Response } from "express";

const response = (
  res: Response,
  statusCode: number,
  message: string,
  data: any = {},
  error: any = {}
) => {
  return res.status(statusCode).json({
    message: message,
    data: data,
    error: error,
  });
};

export default response;
