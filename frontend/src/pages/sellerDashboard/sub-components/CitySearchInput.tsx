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
    <Label htmlFor="city" className="text-gray-300 mb-2 block">
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
      placeholder="Enter your city"
      className="bg-gray-700 text-gray-300 border-gray-600 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors"
    />
    {showSuggestions && cityInput && (
      <div className="absolute w-full z-10 mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
        {isLoadingCities ? (
          <div className="px-4 py-2 text-sm text-gray-400">
            Loading cities...
          </div>
        ) : cityError ? (
          <div className="px-4 py-2 text-sm text-red-400">{cityError}</div>
        ) : cities.length === 0 ? (
          <div className="px-4 py-2 text-sm text-gray-400">No cities found</div>
        ) : (
          cities.map((city) => (
            <div
              key={city}
              className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 cursor-pointer"
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
