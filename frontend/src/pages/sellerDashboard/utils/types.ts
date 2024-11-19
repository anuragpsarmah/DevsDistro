import { ReactNode } from "react";
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

export interface User {
  _id: string;
  username: string;
  name: string;
  profileImageUrl: string;
}

export interface AccountInformationProps {
  isLoading: boolean;
  activeUserData: User;
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

export interface ProfileHeaderProps {
  profileData: ProfileInformation;
  activeUserData: User;
}

export interface chartDataObject {
  month: string;
  sales: number;
}

export interface ChartProps {
  chartData: Array<chartDataObject>;
  isLoading?: boolean;
}

export interface CitySearchInputProps {
  cityInput: string;
  onCityInputChange: (value: string) => void;
  cities: string[];
  isLoadingCities: boolean;
  cityError: string | null;
  onCitySelect: (city: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
}

export interface DashboardCardProps {
  title: string;
  value: string;
  isLoading?: boolean;
}

export interface RepoImportProps {
  userData: User;
  privateRepoData: Array<PrivateRepoData>;
  isLoading: boolean;
  setFormProps: (curr: PrivateRepoData) => void;
  handleRefresh?: () => void;
}

export interface ProjectListingFormProps {
  formProps: PrivateRepoData;
  setFormProps: (curr: PrivateRepoData) => void;
  handleGetPreSignedUrls: (metadata: Array<ProjectMediaMetadata>) => unknown;
}

export interface ReviewSectionProps {
  review: string;
  rating: number;
  onReviewChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onRatingChange: (rating: number) => void;
}

export interface SalesMetricsProps {
  salesInfo: CommonSalesInformation;
  isLoading?: boolean;
}

export interface SidebarContentProps {
  activeTab: string;
  setActiveTab: (tabName: string) => void;
  logout?: () => Promise<void>;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (openStatus: boolean) => void;
  onSwitchToBuyer?: () => void;
}

export interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tabName: string) => void;
  logout?: () => Promise<void>;
  onSwitchToBuyer?: () => void;
}

export interface TransitionWrapperProps {
  isTransitioning: boolean;
  children: ReactNode;
  identifier: string | number;
}

export interface YearSelectorProps {
  selectedYear: string;
  years: number[];
  onYearChange: (value: string) => void;
  isLoading?: boolean;
}

export const ALLOWED_IMAGE_TYPES: { [key: string]: string[] } = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "video/mp4": ["mp4"],
} as const;

export const ALLOWED_VIDEO_TYPES: { [key: string]: string[] } = {
  "video/mp4": ["mp4"],
} as const;

export const MAX_IMAGE_FILE_SIZE = 2 * 1024 * 1024;

export const MAX_VIDEO_FILE_SIZE = 5 * 1024 * 1024;

export interface projectListingFormData {
  title: string;
  description: string;
  projectType: string;
  techStack: string[];
  liveLink: string;
  price: number;
  images: File[];
  video: File | null;
}

export interface ProjectMediaMetadata {
  originalName: string;
  fileType: string;
  fileSize: number;
}
