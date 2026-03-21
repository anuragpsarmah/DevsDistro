export interface ProfileCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  onClick: () => void;
  isHovered: boolean;
  setHovered: () => void;
  setNotHovered: () => void;
}
