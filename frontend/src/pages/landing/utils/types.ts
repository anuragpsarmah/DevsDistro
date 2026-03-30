export interface FAQItem {
  question: string;
  answer: string;
}

export interface HeaderProps {
  handleAuthNavigate: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}
