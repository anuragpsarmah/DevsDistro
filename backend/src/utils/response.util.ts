import { Response } from "express";

const response = (
  res: Response,
  statusCode: number,
  message: string,
  data: any = {},
  error: any = {},
  clearCookieFlag: boolean = false,
  session_token: string = ""
) => {
  const responseObject: { message: string; data: any; error: any } = {
    message,
    data,
    error,
  };

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
  };

  if (clearCookieFlag) {
    return res
      .status(statusCode)
      .clearCookie("session_token", cookieOptions)
      .json(responseObject);
  }

  if (session_token) res.cookie("session_token", session_token, cookieOptions);

  return res.status(statusCode).json(responseObject);
};

export default response;
