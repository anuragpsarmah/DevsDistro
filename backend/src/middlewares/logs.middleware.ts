import { Request, Response, NextFunction } from "express";
import response from "../utils/response.util";
import jwt from "jsonwebtoken";

const logAuthorization = (req: Request, res: Response, next: NextFunction) => {
  let authKey = req.headers.authorization;
  if (!authKey) {
    response(res, 401, "Unauthorized Access");
    return;
  }

  authKey = authKey.replace("Bearer ", "");

  jwt.verify(authKey, process.env.JWT_SECRET as string, (err) => {
    if (err) {
      response(res, 401, "Unauthorized Access");
      return;
    }
    next();
  });
};

export default logAuthorization;
