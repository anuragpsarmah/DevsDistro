import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CitySearchInputProps } from "../utils/types";

export const CitySearchInput: React.FC<CitySearchInputProps> = ({
  cityInput,
  onCityInputChange,
  cities,
  isLoadingCities,
  cityError,
  onCitySelect,
  showSuggestions,
  setShowSuggestions,
}) => (
  <div className="relative">
    <Label
      htmlFor="city"
      className="font-space font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs text-black/50 dark:text-white/50 mb-3 block"
    >
      City
    </Label>
    <Input
      id="city"
      value={cityInput}
      onChange={(e) => {
        onCityInputChange(e.target.value);
        setShowSuggestions(true);
      }}
      onFocus={() => setShowSuggestions(true)}
      onBlur={() => {
        setTimeout(() => setShowSuggestions(false), 200);
      }}
      placeholder="ENTER YOUR CITY"
      className="bg-transparent border-2 border-black/20 dark:border-white/20 text-black dark:text-white hover:border-black dark:hover:border-white focus:border-red-500 focus:ring-0 rounded-none transition-colors duration-300 p-4 font-space h-auto placeholder:text-black/30 placeholder:dark:text-white/30"
    />
    {showSuggestions && cityInput && (
      <div className="absolute w-full z-10 mt-2 bg-white dark:bg-[#050505] border-2 border-black dark:border-white text-black dark:text-white rounded-none shadow-none max-h-60 overflow-auto font-space">
        {isLoadingCities ? (
          <div className="px-5 py-3 text-sm text-gray-500 font-bold uppercase tracking-widest">
            Loading cities...
          </div>
        ) : cityError ? (
          <div className="px-5 py-3 text-sm text-red-500 font-bold uppercase tracking-widest">
            {cityError}
          </div>
        ) : cities.length === 0 ? (
          <div className="px-5 py-3 text-sm text-gray-500 font-bold uppercase tracking-widest">
            No cities found
          </div>
        ) : (
          cities.map((city) => (
            <div
              key={city}
              className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer transition-colors duration-200"
              onMouseDown={(e) => {
                e.preventDefault();
                onCitySelect(city);
              }}
            >
              {city}
            </div>
          ))
        )}
      </div>
    )}
  </div>
);
