import { Router } from "express";
import { searchCities } from "../controllers/cities.controller";
import { citySearchLimiter } from "../utils/rateLimitConfig";

export const citiesRouter = Router();

citiesRouter.route("/searchCities").get(citySearchLimiter, searchCities);
