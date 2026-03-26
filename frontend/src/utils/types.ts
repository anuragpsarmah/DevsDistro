export interface User {
  _id: string;
  username: string;
  name: string;
  profile_image_url: string;
}

export interface AccountSettingsTabProps {
  logout?: () => Promise<void>;
}

export interface DashboardOverviewTabProps {
  logout?: () => Promise<void>;
}

export interface ManageProjectsTabProps {
  logout?: () => Promise<void>;
}

export interface ProfileUpdateData {
  website_url: string;
  x_username: string;
  short_bio: string;
  job_role: string;
  location: string;
  review_description: string;
  review_stars: number;
  profile_visibility: boolean;
  auto_repackage_on_push: boolean;
}

export interface walletAddressData {
  wallet_address: string;
}

export interface WalletUpdatePayload {
  address: string;
  signature?: string;
  message?: string;
}

export interface ProjectMediaMetadata {
  originalName: string;
  fileType: string;
  fileSize: number;
}

export interface projectListingValidatedFormData {
  title: string;
  description: string;
  project_type: string;
  tech_stack: string[];
  live_link: string;
  price: number;
  imageOrder: string[];
  imageOrder_detail: string[];
  project_video: string;
  existingVideo?: string;
}

export interface MarketplaceSearchParams {
  searchTerm?: string;
  projectTypes?: string[];
  techStack?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  limit?: number;
}

export interface MarketplaceProject {
  _id: string;
  title: string;
  description: string;
  project_type: string;
  tech_stack: string[];
  price: number;
  avgRating: number;
  totalReviews: number;
  live_link?: string;
  createdAt: string;
  project_images: string;
  userid: {
    username: string;
    name: string;
    profile_image_url: string;
  };
}

export interface TreeNode {
  name: string;
  type: "directory" | "file";
  children?: TreeNode[];
}

export interface ProjectDetail {
  _id: string;
  title: string;
  description: string;
  project_type: string;
  tech_stack: string[];
  price: number;
  avgRating: number;
  totalReviews: number;
  live_link?: string;
  createdAt: string;
  project_images: string[];
  project_images_detail?: string[];
  project_video?: string;
  repo_tree?: TreeNode;
  repo_tree_status?: string;
  scheduled_deletion_at?: string | null;
  slug?: string;
  userid: {
    username: string;
    name: string;
    profile_image_url: string;
    profile_visibility?: boolean;
    short_bio?: string;
    job_role?: string;
    location?: string;
    website_url?: string;
    x_username?: string;
  } | null;
}

export interface PublicProjectDetail {
  _id: string;
  title: string;
  description: string;
  project_type: string;
  tech_stack: string[];
  price: number;
  avgRating: number;
  totalReviews: number;
  live_link?: string;
  createdAt: string;
  project_images: string[];
  project_images_detail?: string[];
  project_video?: string;
  slug?: string;
  userid: {
    username: string;
    name: string;
    profile_image_url: string;
    profile_visibility?: boolean;
    short_bio?: string;
    job_role?: string;
    location?: string;
    website_url?: string;
    x_username?: string;
  } | null;
}

export interface PurchaseIntent {
  purchase_reference: string;
  price_usd: number;
  price_sol_total: number;
  price_sol_seller: number;
  price_sol_platform: number;
  // Raw lamport values pre-computed by the backend so the frontend constructs
  // the TX with the exact amounts the backend will verify (no client re-computation).
  seller_lamports: number;
  treasury_lamports: number;
  seller_wallet: string;
  treasury_wallet: string;
  sol_usd_rate: number;
  /** ISO timestamp of when the exchange rate was fetched from the oracle */
  exchange_rate_fetched_at: string;
  expires_in: number;
}

export interface PurchasedProject {
  _id: string;
  projectId:
    | (MarketplaceProject & {
        repo_zip_status: string;
        scheduled_deletion_at?: string | null;
      })
    | null;
  price_usd: number;
  price_sol_total: number;
  buyer_wallet: string;
  tx_signature: string;
  createdAt: string;
  project_snapshot: { title: string; project_type: string };
  seller_snapshot: {
    name: string;
    username: string;
    profile_image_url: string;
  };
}

interface SellerSalesTransaction {
  _id: string;
  createdAt: string;
  tx_signature: string;
  price_usd: number;
  price_sol_total: number;
  price_sol_seller: number;
  project_snapshot: {
    title: string;
    project_type: string;
  };
  projectId: {
    _id: string;
    title: string;
    project_type: string;
    scheduled_deletion_at?: string | null;
  } | null;
  buyer_username: string;
  is_unlisted: boolean;
}

export interface SellerSalesTransactionsResponse {
  transactions: SellerSalesTransaction[];
  next_cursor: {
    cursor_created_at: string;
    cursor_id: string;
  } | null;
  has_more: boolean;
  filter_meta: {
    project_options: Array<{
      value: string;
      label: string;
    }>;
    selected_filters: {
      date_preset: "all" | "7d" | "30d" | "thisYear";
      project_filter: string;
      limit: number;
    };
  };
}

export interface PurchaseConfirmPayload {
  purchase_reference: string;
  tx_signature: string;
  buyer_wallet: string;
}

export interface ReviewAuthor {
  _id?: string;
  username: string;
  name: string;
  profile_image_url: string;
}

export interface ProjectReview {
  _id: string;
  projectId: string;
  userId: ReviewAuthor | string;
  rating: number;
  review: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewsResponse {
  reviews: ProjectReview[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasNextPage: boolean;
  };
}

export interface SubmitReviewPayload {
  project_id: string;
  rating: number;
  review?: string;
}

export interface MarketplaceSearchResponse {
  data: {
    projects: MarketplaceProject[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      offset: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}
