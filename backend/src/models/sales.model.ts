import { model, Schema } from "mongoose";

const salesSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "UserId is required"],
    },
    total_sales: {
      type: Number,
      default: 0,
    },
    active_projects: {
      type: Number,
      default: 0,
    },
    customer_rating: {
      type: Number,
      default: -1,
    },
    best_seller: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const Sales = model("Sales", salesSchema);
