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

export type SellerDashboardTabTypes =
  | "Marketplace"
  | "Cart"
  | "Account Settings"
  | "Order History"
  | "Wallet Connection";
