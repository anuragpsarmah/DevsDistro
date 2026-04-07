import { model, Schema } from "mongoose";

const purchaseSchema = new Schema(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Buyer ID is required"],
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller ID is required"],
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      index: true,
    },
    purchased_package_id: {
      type: Schema.Types.ObjectId,
      ref: "ProjectPackage",
      required: [true, "Purchased package ID is required"],
      index: true,
    },

    // USD pricing
    price_usd: {
      type: Number,
      required: [true, "USD price is required"],
    },

    payment_currency: {
      type: String,
      enum: ["USDC", "SOL"],
      default: "SOL",
    },
    payment_total: {
      type: Number,
      default: null,
    },
    payment_seller: {
      type: Number,
      default: null,
    },
    payment_platform: {
      type: Number,
      default: null,
    },
    payment_mint: {
      type: String,
      default: null,
    },
    payment_decimals: {
      type: Number,
      default: 9,
    },

    // SOL amounts (in SOL units, not lamports)
    price_sol_total: {
      type: Number,
      default: 0,
    },
    price_sol_seller: {
      type: Number,
      default: 0,
    },
    price_sol_platform: {
      type: Number,
      default: 0,
    },

    platform_fee_percent: {
      type: Number,
      required: true,
      default: 1,
    },

    // Exchange rate proof
    sol_usd_rate: {
      type: Number,
      required: [true, "SOL/USD rate is required"],
    },
    exchange_rate_source: {
      type: String,
      required: [true, "Exchange rate source is required"],
    },
    exchange_rate_fetched_at: {
      type: Date,
      required: [true, "Exchange rate fetch timestamp is required"],
    },

    // Wallet snapshots at time of purchase
    buyer_wallet: {
      type: String,
      required: [true, "Buyer wallet address is required"],
    },
    seller_wallet: {
      type: String,
      required: [true, "Seller wallet address is required"],
    },
    treasury_wallet: {
      type: String,
      required: [true, "Treasury wallet address is required"],
    },

    // Solana on-chain references
    tx_signature: {
      type: String,
      required: [true, "Transaction signature is required"],
      unique: true,
      index: true,
    },
    purchase_reference: {
      type: String,
      required: [true, "Purchase reference is required"],
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["CONFIRMED"],
      required: true,
    },

    // Snapshots captured at purchase time — survive project/seller changes or deletion
    project_snapshot: {
      title: { type: String, required: true },
      project_type: { type: String, required: true },
      tech_stack: {
        type: [String],
        default: [],
      },
    },
    seller_snapshot: {
      name: { type: String, required: true },
      username: { type: String, required: true },
      profile_image_url: { type: String, default: "" },
    },
    package_snapshot: {
      commit_sha: { type: String, required: true },
      s3_key: { type: String, required: true },
      packaged_at: { type: Date, required: true },
    },
  },
  { timestamps: true }
);

// Prevent duplicate purchases of the same project by the same buyer
purchaseSchema.index({ buyerId: 1, projectId: 1 }, { unique: true });
// Optimizes seller sales ledger pagination/filter queries (unfiltered and date-filtered)
purchaseSchema.index({ sellerId: 1, status: 1, createdAt: -1, _id: -1 });
// Optimizes per-project filtered ledger queries at scale
purchaseSchema.index({
  sellerId: 1,
  status: 1,
  projectId: 1,
  createdAt: -1,
  _id: -1,
});

export const Purchase = model("Purchase", purchaseSchema);
