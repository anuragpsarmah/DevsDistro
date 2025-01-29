import { useState, useEffect } from "react";
import axios from "axios";
import { CITY_SEARCH_DELAY } from "../utils/constants";

interface UseCitySearchProps {
  cityInput: string;
  cities_api_uri: string;
}

export const useCitySearch = ({
  cityInput,
  cities_api_uri,
}: UseCitySearchProps) => {
  const [cities, setCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCities = async () => {
      if (!cityInput) {
        setCities([]);
        return;
      }

      setIsLoadingCities(true);
      setCityError(null);

      try {
        const response = await axios.get(
          `${cities_api_uri}/searchCities?q=${cityInput}`
        );
        setCities(response.data.filteredResults || []);
      } catch (error) {
        console.error("Error fetching cities:", error);
        setCityError("Failed to fetch cities");
        setCities([]);
      } finally {
        setIsLoadingCities(false);
      }
    };

    const timeoutInstance = setTimeout(fetchCities, CITY_SEARCH_DELAY);
    return () => clearTimeout(timeoutInstance);
  }, [cityInput, cities_api_uri]);

  return { cities, isLoadingCities, cityError };
};
