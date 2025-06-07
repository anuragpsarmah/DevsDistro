import { Store, User, ShoppingCart } from "lucide-react";
import { SolanaLogo } from "@/components/ui/solanaLogo";

export const sidebarItems = [
  { icon: Store, label: "Marketplace" },
  { icon: ShoppingCart, label: "Cart" },
  { icon: User, label: "Account Settings" },
  { icon: ShoppingCart, label: "Order History" },
  { icon: SolanaLogo, label: "Wallet Connection" },
] as const;
