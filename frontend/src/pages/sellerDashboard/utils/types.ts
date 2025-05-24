import { ReactNode } from "react";
import { PROJECT_TYPES } from "./constants";
import { PublicKey } from "@solana/web3.js";

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
  repoDataLoading: boolean;
  setFormProps: (curr: PrivateRepoData) => void;
  handleRefresh?: () => Promise<unknown>;
  totalListedProjectsDataLoading: boolean;
  totalListedProjectsData:
    | { data: { totalListedProjects: number } }
    | undefined;
}

export interface ProjectListingFormProps {
  formProps: PrivateRepoData;
  setFormProps: (curr: PrivateRepoData) => void;
  handleGetPreSignedUrls: (
    metadata: Array<ProjectMediaMetadata>,
    existingImageCount: number,
    existingVideoCount: number,
    modificationType: string
  ) => Promise<unknown>;
  handleValidateUploadAndStoreProject: (
    data: projectListingValidatedFormData,
    modificationType: string
  ) => Promise<unknown>;
  setActiveTab: (curr: string) => void;
}

export interface ProjectModificationFormProps {
  formProps: formPropsType;
  setFormProps: (curr: formPropsType) => void;
  handleStateChange: (identifier: string, title?: string) => void;
  handleGetPreSignedUrls: (
    metadata: Array<ProjectMediaMetadata>,
    existingImageCount: number,
    existingVideoCount: number,
    modificationType: string
  ) => Promise<unknown>;
  handleValidateUploadAndStoreProject: (
    data: projectListingValidatedFormData,
    modificationType: string
  ) => Promise<unknown>;
  setActiveTab?: (curr: string) => void;
  logout?: () => Promise<void>;
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

export interface projectListingFormData {
  title: string;
  description: string;
  projectType: string;
  techStack: string[];
  liveLink: string;
  price: number;
  images: File[];
  video: File | null;
  existingImages?: string[];
  existingVideo?: string | null;
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
  project_images: string[];
  project_video: string;
}

export interface UploadOverlayProps {
  uploadProgress: number;
}

export interface ProjectMediaUploaderProps {
  images: File[];
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
  video: File | null;
  setVideo: React.Dispatch<React.SetStateAction<File | null>>;
  existingImages?: string[];
  setExistingImages?: React.Dispatch<React.SetStateAction<string[]>>;
  existingVideo?: string | null;
  setExistingVideo?: React.Dispatch<React.SetStateAction<string | null>>;
}

export interface InitialProjectData {
  isActive: boolean;
  title: string;
  description: string;
  tech_stack: string[];
  project_images: string;
}

export interface ListedProjectsProps {
  initialProjectData: Array<InitialProjectData>;
  handleToggleProjectListing: (title: string) => Promise<unknown>;
  handleDeleteProjectListing: (title: string) => Promise<unknown>;
  handleStateChange: (identifier: string, title: string) => void;
  isLoading: boolean;
  isError: boolean;
  setFormProps: React.Dispatch<React.SetStateAction<formPropsType>>;
}

export interface formPropsType {
  isActive: boolean;
  title: string;
  description: string;
  tech_stack: Array<string>;
  live_link: string;
  price: number;
  project_images: Array<string>;
  project_type: string;
  project_video: string;
}

export interface UseProjectSubmissionProps {
  handleGetPreSignedUrls: (
    metadata: Array<ProjectMediaMetadata>,
    existingImageCount: number,
    existingVideoCount: number,
    modificationType: string
  ) => Promise<unknown>;
  handleValidateUploadAndStoreProject: (
    data: projectListingValidatedFormData,
    modificationType: string
  ) => unknown;
  modificationType: string;
  setActiveTab?: (curr: string) => void;
  handleReturnToAllListings?: () => void;
}

export interface ConnectToWalletProps {
  walletAddress: string | null;
  isLoading: boolean;
  isError: boolean;
  onWalletConnect: (address: string) => Promise<void>;
  onWalletDisconnect: () => Promise<void>;
}

interface WalletAdapter {
  adapter: {
    name: string;
    icon?: string;
  };
  readyState: string;
  icon?: string;
}

export interface WalletConnectProps {
  detectedWallets: WalletAdapter[];
  otherWallets: WalletAdapter[];
  isProcessing: boolean;
  onSelectWallet: (wallet: WalletAdapter) => void;
  onWalletRedirect: (url: string) => void;
}

export interface WalletDisconnectProps {
  displayAddress: string;
  hasWalletMismatch: boolean;
  isProcessing: boolean;
  onDisconnect: () => void;
  onCopyAddress: () => void;
  onViewOnExplorer: () => void;
}

export interface WalletMismatchWarningProps {
  hasWalletMismatch: boolean;
  hasStoredButNotConnected: boolean;
  walletAddress: string | null;
  publicKey: PublicKey | null;
  intentionalOperation: boolean;
}
