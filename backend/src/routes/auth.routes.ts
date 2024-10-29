import { Router } from "express";
import {
  githubLogin,
  authValidation,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middlewares";

export const authRouter = Router();

authRouter.route("/githubLogin").get(githubLogin);
authRouter.route("/authValidation").get(authMiddleware, authValidation);
