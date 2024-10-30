import { Router } from "express";
import { githubLogin, authValidation } from "../controllers/auth.controller";
import { sessionValidation } from "../middlewares/sessionValidation.middlewares";

export const authRouter = Router();

authRouter.route("/githubLogin").get(githubLogin);
authRouter.route("/authValidation").get(sessionValidation, authValidation);
