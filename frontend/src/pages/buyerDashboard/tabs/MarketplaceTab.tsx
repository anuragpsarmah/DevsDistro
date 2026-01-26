import SearchBar from "../main-components/Searchbar";

interface MarketplaceTabProps {
  logout?: () => Promise<void>;
}

export default function MarketplaceTab({}: MarketplaceTabProps) {
  return (
    <>
      <SearchBar />
    </>
  );
}
