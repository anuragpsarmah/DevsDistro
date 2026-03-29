import { ReactNode } from "react";
import { PROJECT_TYPES } from "./constants";
import { PublicKey } from "@solana/web3.js";

export type ImageItem =
  | { type: "existing"; url: string }
  | { type: "new"; file: File; id: number; objectUrl: string };

export type ImageCropResult =
  | { type: "existing_complete"; cardUrl: string; detailUrl: string }
  | { type: "existing_recrop"; cardUrl: string; detailBlob: Blob }
  | { type: "existing_card_recrop"; cardBlob: Blob; detailUrl: string }
  | { type: "new"; cardBlob: Blob; detailBlob: Blob };

export type SellerDashboardTabTypes =
  | "Overview"
  | "Settings"
  | "List Project"
  | "My Projects"
  | "Sales"
  | "Wallet";

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChartDataObject {
  month: string;
  sales: number;
}

export interface SalesTransactionCardProps {
  transaction: SellerSalesTransaction;
  clusterParam: string;
}

export interface SellerSalesTransaction {
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

export interface CommonSalesInformation {
  active_projects: number;
  best_seller: string;
  customer_rating: number;
  total_sales: number;
}

export interface ProfileInformation {
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

export interface PrivateRepoData {
  name: string;
  description: string;
  language: string;
  updated_at: string;
  github_repo_id: string;
  installation_id?: number;
}

export type ProjectType = (typeof PROJECT_TYPES)[number];

export interface User {
  _id: string;
  username: string;
  name: string;
  profile_image_url: string;
}

export interface AccountInformationProps {
  isInitialLoading: boolean;
  isSaving: boolean;
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

export interface ChartProps {
  chartData: Array<ChartDataObject>;
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
  repoDataError: boolean;
  setFormPropsAndSwitchUI: (curr: PrivateRepoData) => void;
  handleRefresh?: () => Promise<unknown>;
  isRefreshing?: boolean;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  totalListedProjectsDataLoading: boolean;
  totalListedProjectsData:
    | { data: { totalListedProjects: number; projectListingLimit: number } }
    | undefined;
}

export interface ProjectListingFormProps {
  formProps: PrivateRepoData;
  setFormPropsAndSwitchUI: (curr: PrivateRepoData) => void;
  handleGetPreSignedUrls: (
    metadata: Array<ProjectMediaMetadata>,
    existingImageCount: number,
    existingVideoCount: number,
    modificationType: string,
    detailMetadata?: Array<ProjectMediaMetadata>
  ) => Promise<unknown>;
  handleValidateUploadAndStoreProject: (
    data: projectListingValidatedFormData,
    modificationType: string
  ) => Promise<unknown>;
  setActiveTab: (curr: SellerDashboardTabTypes) => void;
}

export interface ProjectModificationFormProps {
  formProps: formPropsType;
  setFormProps: (curr: formPropsType) => void;
  handleUIStateChange: (identifier: string, title?: string) => void;
  handleGetPreSignedUrls: (
    metadata: Array<ProjectMediaMetadata>,
    existingImageCount: number,
    existingVideoCount: number,
    modificationType: string,
    detailMetadata?: Array<ProjectMediaMetadata>
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
  setActiveTab: (tabName: SellerDashboardTabTypes) => void;
  logout?: () => Promise<void>;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (openStatus: boolean) => void;
  onSwitchToBuyer?: () => void;
}

export interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tabName: SellerDashboardTabTypes) => void;
  logout?: () => Promise<void>;
  onSwitchToBuyer?: () => void;
}

export interface TransitionWrapperProps {
  isTransitioning: boolean;
  children: ReactNode;
  identifier: string | number;
  className?: string;
}

export interface MonthlySalesProps {
  selectedYear: string;
  years: number[];
  onYearChange: (value: string) => void;
  isLoading?: boolean;
  chartData: Array<ChartDataObject>;
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
  imageItems: ImageItem[];
  video: File | null;
  existingVideo?: string | null;
}

export interface SalesLedgerProps {
  transactions: SellerSalesTransaction[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  isInitialError: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  clusterParam: string;
}

export interface ProjectGeneralInfoProps {
  setDescription: (curr: string) => void;
  setTechInput: (curr: string) => void;
  setTechStack: (curr: string[]) => void;
  setProjectType: (curr: ProjectType) => void;
  setLiveLink: (curr: string) => void;
  defaultTitle: string;
  description: string;
  techInput: string;
  techStack: string[];
  projectType: ProjectType;
  liveLink: string;
  title: React.MutableRefObject<HTMLInputElement | null>;
}

export interface GitHubAppInstallPromptProps {
  installUrl: string;
}

export interface SalesTabProps {
  logout?: () => Promise<void>;
}

export interface BillingAndPaymentsTabProps {
  logout?: () => Promise<void>;
}

export interface ListNewProjectTabProps {
  logout?: () => Promise<void>;
  setActiveTab: (curr: SellerDashboardTabTypes) => void;
}

export type DatePreset = "all" | "7d" | "30d" | "thisYear";

export type ProjectSubmitFormData = Omit<projectListingFormData, "imageItems">;

export interface ProjectMediaMetadata {
  originalName: string;
  fileType: string;
  fileSize: number;
}

export interface projectListingValidatedFormData {
  github_repo_id: string;
  installation_id?: number;
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

export interface UploadOverlayProps {
  uploadProgress: number;
}

export interface ProjectMediaUploaderProps {
  imageItems: ImageItem[];
  setImageItems: React.Dispatch<React.SetStateAction<ImageItem[]>>;
  video: File | null;
  setVideo: React.Dispatch<React.SetStateAction<File | null>>;
  existingVideo?: string | null;
  setExistingVideo?: React.Dispatch<React.SetStateAction<string | null>>;
}

export interface InitialProjectData {
  _id: string;
  github_repo_id: string;
  isActive: boolean;
  github_access_revoked?: boolean;
  scheduled_deletion_at?: string | null;
  title: string;
  description: string;
  tech_stack: string[];
  project_images: string;
  repo_zip_status?: "PROCESSING" | "SUCCESS" | "FAILED";
  price: number;
  live_link?: string;
  downloadCount: number;
}

export interface ListedProjectsProps {
  initialProjectData: Array<InitialProjectData>;
  showWalletConnectionNotice?: boolean;
  onNavigateToWallet?: () => void;
  handleToggleProjectListing: (title: string) => Promise<unknown>;
  handleDeleteProjectListing: (title: string) => Promise<unknown>;
  handleUIStateChange: (identifier: string, title: string) => void;
  handleRetryRepoZipUpload: (github_repo_id: string) => Promise<void>;
  handleRefreshRepoZipStatus: (index: number) => Promise<string | null>;
  handleRefreshRepoZip: (github_repo_id: string) => Promise<void>;
  isLoading: boolean;
  isError: boolean;
  setFormProps: React.Dispatch<React.SetStateAction<formPropsType>>;
  onViewReviews: (projectId: string, projectTitle: string) => void;
}

export interface formPropsType {
  github_repo_id: string;
  isActive: boolean;
  title: string;
  description: string;
  tech_stack: Array<string>;
  live_link: string;
  price: number;
  project_images: Array<string>;
  project_images_detail?: Array<string>;
  project_type: string;
  project_video: string;
  github_installation_id?: number;
}

export interface UseProjectSubmissionProps {
  handleGetPreSignedUrls: (
    metadata: Array<ProjectMediaMetadata>,
    existingImageCount: number,
    existingVideoCount: number,
    modificationType: string,
    detailMetadata?: Array<ProjectMediaMetadata>
  ) => Promise<unknown>;
  handleValidateUploadAndStoreProject: (
    data: projectListingValidatedFormData,
    modificationType: string
  ) => unknown;
  modificationType: string;
  setActiveTab?: (curr: SellerDashboardTabTypes) => void;
  handleReturnToAllListings?: () => void;
  onRepoAccessError?: () => void;
  github_repo_id: string;
  installation_id?: number;
}

export interface ConnectToWalletProps {
  walletAddress: string | null;
  isLoading: boolean;
  isError: boolean;
  onWalletConnect: (
    address: string,
    signature: string,
    message: string
  ) => Promise<void>;
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
  hasStoredButNotConnected: boolean;
  walletAddress: string | null;
  publicKey: PublicKey | null;
  intentionalOperation: boolean;
}

export interface WalletMismatchWarningProps {
  hasWalletMismatch: boolean;
  hasStoredButNotConnected: boolean;
  walletAddress: string | null;
  publicKey: PublicKey | null;
  intentionalOperation: boolean;
}
