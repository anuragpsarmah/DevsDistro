import { Router } from "express";
import { searchCities } from "../controllers/cities.controller";
import { citySearchLimiter } from "../utils/rateLimitConfig.util";

export const citiesRouter = Router();

citiesRouter.route("/searchCities").get(citySearchLimiter, searchCities);
