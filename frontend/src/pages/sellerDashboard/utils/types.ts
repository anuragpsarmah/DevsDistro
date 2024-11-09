import { PROJECT_TYPES } from "./constants";

export interface ChartDataObject {
  month: string;
  sales: number;
}

export interface CommonSalesInformation {
  active_projects: number;
  best_seller: string;
  customer_rating: number;
  total_sales: number;
}

export interface ProfileInformation {
  username: string;
  name: string;
  profileImageUrl: string;
  jobRole: string;
  location: string;
  reviewDescription: string;
  reviewStar: number;
  profileVisibility: boolean;
}

export interface ProfileUpdatePayload {
  job_role: string;
  location: string;
  review_description: string;
  review_stars: number;
  profile_visibility: boolean;
}

export interface PrivateRepoData {
  name: string;
  description: string;
  language: string;
  updated_at: string;
}

export type ProjectType = (typeof PROJECT_TYPES)[number];

export interface AccountInformationProps {
  isLoading: boolean;
  profileInformationData: ProfileInformation;
  selectedJobRole: string;
  setSelectedJobRole: (curr: string) => void;
  cityInput: string;
  setCityInput: (curr: string) => void;
  cities: string[];
  isLoadingCities: boolean;
  cityError: string | null;
  handleCitySelect: (selectedCity: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (curr: boolean) => void;
  review: string;
  rating: number;
  handleReviewChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  setRating: (curr: number) => void;
  setProfileInformationData: React.Dispatch<
    React.SetStateAction<ProfileInformation>
  >;
}
