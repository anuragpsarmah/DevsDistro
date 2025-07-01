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

export interface CityInfo {
  city: string;
  iso2: string;
}

export interface ProjectQuery {
  isActive: boolean;
  project_type?: { $in: string[] };
  $text?: { $search: string };
}

export interface ProjectSort {
  score?: { $meta: "textScore" };
  createdAt?: 1 | -1;
  price?: 1 | -1;
  avgRating?: 1 | -1;
  totalReviews?: 1 | -1;
  [key: string]: any; // Add index signature for flexibility
}

export type SortOption =
  | "newest"
  | "price_low"
  | "price_high"
  | "rating_high"
  | "rating_low";
