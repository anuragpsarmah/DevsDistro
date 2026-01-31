import SearchBar from "../main-components/Searchbar";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";

interface MarketplaceTabProps {
  logout?: () => Promise<void>;
}

export default function MarketplaceTab({}: MarketplaceTabProps) {
  return (
    <AnimatedLoadWrapper>
      <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
        <h1 className="text-4xl text-center md:text-left lg:text-left font-bold mb-6 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
          Marketplace
        </h1>
        <SearchBar />
      </div>
    </AnimatedLoadWrapper>
  );
}
