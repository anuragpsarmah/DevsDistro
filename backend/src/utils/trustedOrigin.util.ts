import { Request } from "express";

export const isTrustedOrigin = (req: Request): boolean => {
  const origin = req.get("origin");
  if (!origin) return true;

  const allowedOrigins = [
    process.env.FRONTEND_URI,
    "http://localhost:5173",
  ].filter(Boolean) as string[];

  return allowedOrigins.includes(origin);
};
