import { Response } from "express";
import { REFRESH_TOKEN_DURATION_MS } from "../config/tokenConfig";

const response = (
  res: Response,
  statusCode: number,
  message: string,
  data: any = {},
  error: any = {},
  clearCookieFlag: boolean = false,
  session_token: string = "",
  refresh_token: string = "",
  clearRefreshCookie: boolean = false
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
    let chain = res.status(statusCode).clearCookie("session_token", cookieOptions);
    if (clearRefreshCookie) {
      chain = chain.clearCookie("refresh_token", cookieOptions);
    }
    return chain.json(responseObject);
  }

  if (session_token) res.cookie("session_token", session_token, cookieOptions);

  if (refresh_token) {
    res.cookie("refresh_token", refresh_token, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_DURATION_MS,
    });
  }

  return res.status(statusCode).json(responseObject);
};

export default response;
