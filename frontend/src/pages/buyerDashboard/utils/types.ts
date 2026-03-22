import { ReactNode } from "react";

export interface SidebarContentProps {
  activeTab: string;
  setActiveTab: (tabName: BuyerDashboardTabTypes) => void;
  logout?: () => Promise<void>;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (openStatus: boolean) => void;
  onSwitchToSeller?: () => void;
}

export interface MarketplaceTabProps {
  logout?: () => Promise<void>;
  initialProjectId?: string | null;
}

export interface OrdersTabProps {
  logout?: () => Promise<void>;
}

export interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
  logout?: () => Promise<void>;
  backLabel?: string;
}

export interface PurchaseLedgerTabProps {
  logout?: () => Promise<void>;
}

export interface WishlistTabProps {
  logout?: () => Promise<void>;
}

export interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tabName: BuyerDashboardTabTypes) => void;
  logout?: () => Promise<void>;
  onSwitchToSeller?: () => void;
}

export type BuyerDashboardTabTypes =
  | "Marketplace"
  | "Wishlist"
  | "Purchases"
  | "Purchase Ledger";

export interface TransitionWrapperProps {
  isTransitioning: boolean;
  children: ReactNode;
  identifier: string | number;
  className?: string;
}
