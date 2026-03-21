import { Router } from "express";
import { sessionValidation } from "../middlewares/sessionValidation.middlewares";
import {
  toggleWishlist,
  getWishlist,
  getWishlistCount,
} from "../controllers/wishlist.controller";
import {
  wishlistToggleLimiter,
  generalAuthReadLimiter,
} from "../utils/rateLimitConfig.util";

export const wishlistRouter = Router();

wishlistRouter
  .route("/toggle")
  .post(wishlistToggleLimiter, sessionValidation, toggleWishlist);
wishlistRouter
  .route("/getWishlist")
  .get(generalAuthReadLimiter, sessionValidation, getWishlist);
wishlistRouter
  .route("/count")
  .get(generalAuthReadLimiter, sessionValidation, getWishlistCount);
