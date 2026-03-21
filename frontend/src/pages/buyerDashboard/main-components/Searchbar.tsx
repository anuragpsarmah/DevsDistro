import { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  X,
  Check,
} from "lucide-react";

const PROJECT_TYPES = [
  "Web Application",
  "Mobile Application",
  "Desktop Application",
  "SaaS Platform",
  "E-commerce Platform",
  "CMS/Blog",
  "Framework",
  "Library",
  "API",
  "CLI Tool",
  "UI Component",
  "Data Visualization",
  "Game",
  "IoT Application",
  "Machine Learning/AI",
  "Blockchain Application",
  "DevOps Tool",
  "Cybersecurity Tool",
  "Scientific Computing",
  "Educational Application",
  "Enterprise Software",
  "Productivity Tool",
  "Other",
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "rating_high", label: "Rating: High to Low" },
  { value: "rating_low", label: "Rating: Low to High" },
] as const;

interface SearchBarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedFilters: string[];
  onFiltersChange: (filters: string[]) => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
}

export default function SearchBar({
  searchQuery,
  onSearchQueryChange,
  selectedFilters,
  onFiltersChange,
  selectedSort,
  onSortChange,
}: SearchBarProps) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sortTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const sortContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (mobile) {
        setShowFilterDropdown(false);
        setShowSortDropdown(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    return () => {
      if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
      if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current);
    };
  }, []);

  const handleFilterToggle = (filter: string) => {
    const updated = selectedFilters.includes(filter)
      ? selectedFilters.filter((f) => f !== filter)
      : [...selectedFilters, filter];
    onFiltersChange(updated);
  };

  const clearFilters = () => {
    onFiltersChange([]);
  };

  const handleSortChange = (sortValue: string) => {
    onSortChange(sortValue);
    setShowSortDropdown(false);
  };

  const getSortLabel = () => {
    return (
      SORT_OPTIONS.find((option) => option.value === selectedSort)?.label ||
      "Sort by"
    );
  };

  const handleFilterHoverEnter = () => {
    if (!isMobile) {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
        filterTimeoutRef.current = null;
      }
      setShowFilterDropdown(true);
    }
  };

  const handleFilterHoverLeave = () => {
    if (!isMobile) {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
      filterTimeoutRef.current = setTimeout(() => {
        setShowFilterDropdown(false);
      }, 100);
    }
  };

  const handleSortHoverEnter = () => {
    if (!isMobile) {
      if (sortTimeoutRef.current) {
        clearTimeout(sortTimeoutRef.current);
        sortTimeoutRef.current = null;
      }
      setShowSortDropdown(true);
    }
  };

  const handleSortHoverLeave = () => {
    if (!isMobile) {
      if (sortTimeoutRef.current) {
        clearTimeout(sortTimeoutRef.current);
      }
      sortTimeoutRef.current = setTimeout(() => {
        setShowSortDropdown(false);
      }, 100);
    }
  };

  const handleFilterClick = () => {
    if (isMobile) {
      setShowFilterDropdown(!showFilterDropdown);
      setShowSortDropdown(false);
    }
  };

  const handleSortClick = () => {
    if (isMobile) {
      setShowSortDropdown(!showSortDropdown);
      setShowFilterDropdown(false);
    }
  };

  return (
    <div className="w-full">
      <div className="relative overflow-visible">
        <div className="relative flex flex-col lg:flex-row items-stretch lg:items-center bg-white dark:bg-[#050505] border-2 border-black dark:border-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)] transition-shadow duration-300">
          <div className="flex-1 relative group border-b-2 lg:border-b-0 lg:border-r-2 border-black dark:border-white">
            <div className="absolute left-6 top-1/2 transform -translate-y-1/2 transition-colors duration-300">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-red-500" />
            </div>
            <input
              type="text"
              placeholder="Search Projects"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-transparent text-black dark:text-white placeholder-gray-500 focus:outline-none text-lg font-space font-bold focus:placeholder-black dark:focus:placeholder-white transition-colors duration-300 hover:bg-black/5 dark:hover:bg-white/5"
            />
          </div>

          <div className="flex lg:hidden">
            <div className="relative flex-1 border-r-2 border-black dark:border-white">
              <button
                onClick={handleFilterClick}
                className="flex items-center justify-center gap-2 w-full px-4 py-4 font-space font-bold uppercase tracking-wider text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300"
              >
                <Filter className="h-5 w-5" />
                <span>Filter</span>
                {selectedFilters.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 min-w-[20px] text-center font-bold">
                    {selectedFilters.length}
                  </span>
                )}
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 ${showFilterDropdown ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            <div className="relative flex-1">
              <button
                onClick={handleSortClick}
                className="flex items-center justify-center gap-2 w-full px-4 py-4 font-space font-bold uppercase tracking-wider text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300"
              >
                <ArrowUpDown className="h-5 w-5" />
                <span>Sort</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 ${showSortDropdown ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </div>

          <div className="hidden lg:flex">
            <div
              ref={filterContainerRef}
              className="relative border-r-2 border-black dark:border-white"
              onMouseEnter={handleFilterHoverEnter}
              onMouseLeave={handleFilterHoverLeave}
            >
              <button className="flex items-center gap-3 px-8 py-4 font-space font-bold uppercase tracking-wider text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 group">
                <Filter className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                <span>Filter</span>
                {selectedFilters.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2.5 py-1 min-w-[20px] text-center font-bold shadow-none">
                    {selectedFilters.length}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
              </button>
            </div>

            <div
              ref={sortContainerRef}
              className="relative"
              onMouseEnter={handleSortHoverEnter}
              onMouseLeave={handleSortHoverLeave}
            >
              <button className="flex items-center gap-3 px-8 py-4 font-space font-bold uppercase tracking-wider text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 group">
                <ArrowUpDown className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                <span>{getSortLabel()}</span>
                <ChevronDown className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>

        <div
          className={`absolute top-full right-0 lg:right-32 mt-4 w-full max-w-sm bg-white dark:bg-[#050505] border-2 border-black dark:border-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)] z-50 transition-all duration-300 transform ${
            showFilterDropdown
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
          }`}
          onMouseEnter={handleFilterHoverEnter}
          onMouseLeave={handleFilterHoverLeave}
        >
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6 border-b-2 border-black dark:border-white pb-2">
              <h3 className="text-black dark:text-white font-syne font-bold uppercase tracking-widest text-lg">
                Project Types
              </h3>
              {selectedFilters.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-red-500 hover:bg-red-500 hover:text-white font-space font-bold uppercase tracking-wider text-xs flex items-center gap-1 px-3 py-1 border-2 border-transparent hover:border-black dark:hover:border-white transition-all duration-300"
                >
                  <X className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
              {PROJECT_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-3 p-2 border-2 border-transparent hover:border-black dark:hover:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 cursor-pointer group"
                >
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedFilters.includes(type)}
                      onChange={() => handleFilterToggle(type)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 border-2 flex items-center justify-center transition-all duration-300 ${
                        selectedFilters.includes(type)
                          ? "bg-red-500 border-black dark:border-white"
                          : "border-black dark:border-white bg-white dark:bg-[#050505]"
                      }`}
                    >
                      {selectedFilters.includes(type) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </div>
                  <span className="font-space font-bold text-sm transition-colors duration-300">
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`absolute top-full right-0 mt-4 w-full max-w-xs bg-white dark:bg-[#050505] border-2 border-black dark:border-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)] z-50 transition-all duration-300 transform ${
            showSortDropdown
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
          }`}
          onMouseEnter={handleSortHoverEnter}
          onMouseLeave={handleSortHoverLeave}
        >
          <div className="relative p-3 flex flex-col gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={`w-full text-left px-4 py-3 border-2 transition-all duration-300 flex items-center justify-between font-space font-bold uppercase tracking-wider text-sm ${
                  selectedSort === option.value
                    ? "bg-red-500 text-white border-black dark:border-white"
                    : "border-transparent text-black dark:text-white hover:border-black dark:hover:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                }`}
              >
                <span>{option.label}</span>
                {selectedSort === option.value && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ef4444;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #000;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #fff;
        }
      `}</style>
    </div>
  );
}
