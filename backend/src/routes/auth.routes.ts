import { Router } from "express";
import { githubLogin } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.route("/githubLogin").get(githubLogin);
