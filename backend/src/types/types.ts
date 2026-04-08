export interface FileMetaData {
  originalName: string;
  fileType: string;
  fileSize: number;
}

export interface UploadMetadata {
  timestamp: number;
  expectedType: string;
  expectedSize: number;
}

export interface UserType {
  _id: string;
  username: string;
  name: string;
  profile_image_url: string;
}

export interface MonthlySales {
  month: Number;
  sales: Number;
}

export interface ProjectQuery {
  isActive: boolean;
  github_access_revoked: boolean;
  repo_zip_status: string;
  scheduled_deletion_at?: Date | null;
  project_type?: { $in: string[] };
  tech_stack?: { $in: string[] };
  price?: { $gte?: number; $lte?: number };
  $or?: Array<Record<string, unknown>>;
}

export interface ProjectSort {
  createdAt?: 1 | -1;
  price?: 1 | -1;
  avgRating?: 1 | -1;
  totalReviews?: 1 | -1;
  [key: string]: any;
}

export type SortOption =
  | "newest"
  | "price_low"
  | "price_high"
  | "rating_high"
  | "rating_low";

export interface InstallationToken {
  token: string;
  expires_at: string;
}

export type TreeNode = {
  name: string;
  type: "file" | "directory";
  children?: TreeNode[];
};

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  updated_at: string;
  default_branch?: string;
}

export interface Installation {
  id: number;
  account: {
    login: string;
    id: number;
    type: string;
  };
  repository_selection: "all" | "selected";
  suspended_at: string | null;
}

export interface VerifyParams {
  txSignature: string;
  expectedBuyerWallet: string;
  expectedSellerWallet: string;
  expectedTreasuryWallet: string;
  paymentCurrency?: "USDC" | "SOL";
  expectedMint?: string;
  expectedTotalAmountAtomic?: number;
  expectedSellerAmountAtomic?: number;
  expectedTreasuryAmountAtomic?: number;
  expectedSellerLamports: number;
  expectedTreasuryLamports: number;
  purchaseReference: string;
  rpcUrl: string;
  /** Optional fallback RPC to retry against if the primary call fails. Only pass for mainnet. */
  fallbackRpcUrl?: string;
}

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

export type ProjectPackageSource =
  | "INITIAL_LISTING"
  | "MANUAL_REPACKAGE"
  | "AUTO_REPACKAGE";

export type DownloadVersion = "latest" | "purchased";
