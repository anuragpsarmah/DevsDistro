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
  { value: "price-high", label: "Price: High to Low" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "rating-high", label: "Rating: High to Low" },
  { value: "rating-low", label: "Rating: Low to High" },
] as const;

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState("newest");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sortTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const sortContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // Use lg breakpoint
      setIsMobile(mobile);

      // Reset dropdowns when switching between mobile/desktop
      if (mobile) {
        setShowFilterDropdown(false);
        setShowSortDropdown(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
      if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current);
    };
  }, []);

  const handleFilterToggle = (filter: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  const clearFilters = () => {
    setSelectedFilters([]);
  };

  const handleSortChange = (sortValue: string) => {
    setSelectedSort(sortValue);
    setShowSortDropdown(false);
  };

  const getSortLabel = () => {
    return (
      SORT_OPTIONS.find((option) => option.value === selectedSort)?.label ||
      "Sort by"
    );
  };

  // Desktop hover handlers
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

  // Mobile click handlers
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
      {/* Main Search Bar */}
      <div className="relative overflow-visible rounded-3xl">
        {/* Glassmorphism Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-3xl border border-gray-700/50 shadow-2xl"></div>

        {/* Glow Effect - contained within border */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-lg opacity-50"></div>

        <div className="relative flex flex-col lg:flex-row items-stretch lg:items-center overflow-hidden rounded-3xl">
          {/* Search Input */}
          <div className="flex-1 relative group">
            <div className="absolute left-6 top-1/2 transform -translate-y-1/2 transition-colors duration-300">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400" />
            </div>
            <input
              type="text"
              placeholder="Search Projects"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-3 bg-transparent text-white placeholder-gray-400 focus:outline-none text-lg font-medium focus:placeholder-gray-500 transition-colors duration-300 hover:bg-white/5"
            />
          </div>

          {/* Mobile: Buttons in Row */}
          <div className="flex lg:hidden border-t border-gray-700/50">
            {/* Filter Button Mobile */}
            <div className="relative flex-1">
              <button
                onClick={handleFilterClick}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 text-gray-300 hover:text-white transition-all duration-300 hover:bg-white/5 border-r border-gray-700/50"
              >
                <Filter className="h-5 w-5" />
                <span className="font-medium">Filter</span>
                {selectedFilters.length > 0 && (
                  <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center font-bold">
                    {selectedFilters.length}
                  </span>
                )}
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 ${showFilterDropdown ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* Sort Button Mobile */}
            <div className="relative flex-1">
              <button
                onClick={handleSortClick}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 text-gray-300 hover:text-white transition-all duration-300 hover:bg-white/5"
              >
                <ArrowUpDown className="h-5 w-5" />
                <span className="font-medium">Sort</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 ${showSortDropdown ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Desktop: Buttons Side by Side */}
          <div className="hidden lg:flex">
            {/* Filter Button Desktop */}
            <div
              ref={filterContainerRef}
              className="relative"
              onMouseEnter={handleFilterHoverEnter}
              onMouseLeave={handleFilterHoverLeave}
            >
              <button className="flex items-center gap-3 px-8 py-3 text-gray-300 hover:text-white transition-all duration-300 border-l border-gray-700/50 hover:bg-white/5 group">
                <Filter className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-medium">Filter</span>
                {selectedFilters.length > 0 && (
                  <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2.5 py-1 rounded-full min-w-[20px] text-center font-bold shadow-lg">
                    {selectedFilters.length}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
              </button>
            </div>

            {/* Sort Button Desktop */}
            <div
              ref={sortContainerRef}
              className="relative"
              onMouseEnter={handleSortHoverEnter}
              onMouseLeave={handleSortHoverLeave}
            >
              <button className="flex items-center gap-3 px-8 py-3 text-gray-300 hover:text-white transition-all duration-300 border-l border-gray-700/50 hover:bg-white/5 group rounded-r-3xl">
                <ArrowUpDown className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-medium">{getSortLabel()}</span>
                <ChevronDown className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Dropdown - Always in DOM */}
        <div
          className={`absolute top-full right-0 lg:right-32 mt-4 w-full max-w-sm bg-gray-900/95 backdrop-blur-2xl border border-gray-700/50 rounded-2xl shadow-2xl z-50 overflow-hidden transition-all duration-300 transform ${
            showFilterDropdown
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
          }`}
          onMouseEnter={handleFilterHoverEnter}
          onMouseLeave={handleFilterHoverLeave}
        >
          {/* Glow effect for dropdown */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl"></div>

          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Project Types
              </h3>
              {selectedFilters.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2 px-3 py-1 rounded-full hover:bg-blue-500/10 transition-all duration-300"
                >
                  <X className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-80 overflow-y-auto custom-scrollbar pr-2">
              {PROJECT_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-300 cursor-pointer group"
                >
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={selectedFilters.includes(type)}
                      onChange={() => handleFilterToggle(type)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                        selectedFilters.includes(type)
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 border-transparent shadow-lg"
                          : "border-gray-500 hover:border-gray-400 group-hover:scale-110"
                      }`}
                    >
                      {selectedFilters.includes(type) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </div>
                  <span className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors duration-300">
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Sort Dropdown - Always in DOM */}
        <div
          className={`absolute top-full right-0 mt-4 w-full max-w-xs bg-gray-900/95 backdrop-blur-2xl border border-gray-700/50 rounded-2xl shadow-2xl z-50 overflow-hidden transition-all duration-300 transform ${
            showSortDropdown
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
          }`}
          onMouseEnter={handleSortHoverEnter}
          onMouseLeave={handleSortHoverLeave}
        >
          {/* Glow effect for dropdown */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl"></div>

          <div className="relative p-3">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-between font-medium ${
                  selectedSort === option.value
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
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
          background: rgba(55, 65, 81, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
        }
      `}</style>
    </div>
  );
}
