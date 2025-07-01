import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useProfileInformationQuery } from "@/hooks/apiQueries";
import { useProfileUpdateMutation } from "@/hooks/apiMutations";
import { ProfileHeader } from "../main-components/ProfileHeader";
import { ProfileHeaderSkeleton } from "../sub-components/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { useCitySearch } from "../hooks/useCitySearch";
import {
  MAX_REVIEW_LENGTH,
  INITIAL_PROFILE_INFORMATION_DATA,
} from "../utils/constants";
import type { ProfileInformation } from "../utils/types";
import AccountInformation from "../main-components/AccountInformation";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import { useRecoilState } from "recoil";
import { user } from "@/utils/atom";
import { MagicCard } from "@/components/ui/magic-card";

interface AccountSettingsTabProps {
  logout?: () => Promise<void>;
}

export default function AccountSettingsTab({
  logout,
}: AccountSettingsTabProps) {
  const [profileInformationData, setProfileInformationData] =
    useState<ProfileInformation>(INITIAL_PROFILE_INFORMATION_DATA);
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(0);
  const [cityInput, setCityInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedJobRole, setSelectedJobRole] = useState("");
  const [activeUser] = useRecoilState(user);

  const cities_api_uri = import.meta.env.VITE_CITIES_API_URI;

  const { cities, isLoadingCities, cityError } = useCitySearch({
    cityInput,
    cities_api_uri,
  });

  const {
    data: profileInformationQueryData,
    isLoading: profileInformationQueryLoading,
    isError: profileInformationQueryError,
    isFetching: profileInformationQueryFetching,
  } = useProfileInformationQuery({ logout });

  const { mutateAsync, isPending } = useProfileUpdateMutation({ logout });

  const handleProfileUpdate = async () => {
    await mutateAsync({
      job_role: selectedJobRole,
      location: cityInput,
      review_description: review,
      review_stars: rating,
      profile_visibility: profileInformationData.profile_visibility,
    });
  };

  const handleReviewChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_REVIEW_LENGTH) {
      setReview(e.target.value);
    }
  };

  const handleCitySelect = (selectedCity: string) => {
    setCityInput(selectedCity);
    setTimeout(() => setShowSuggestions(false), 50);
  };

  useEffect(() => {
    if (
      !profileInformationQueryError &&
      !profileInformationQueryFetching &&
      profileInformationQueryData?.data
    ) {
      setProfileInformationData(profileInformationQueryData.data);
      setSelectedJobRole(profileInformationQueryData.data.job_role);
      setRating(profileInformationQueryData.data.review_stars);
      setReview(profileInformationQueryData.data.review_description);
      setCityInput(profileInformationQueryData.data.location);
    }
  }, [
    profileInformationQueryData,
    profileInformationQueryError,
    profileInformationQueryFetching,
  ]);

  const isInitialLoading = profileInformationQueryLoading;

  return (
    <AnimatedLoadWrapper>
      <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
        <h1 className="text-4xl text-center md:text-left lg:text-left font-bold mb-6 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
          Account Settings
        </h1>

        <MagicCard
          className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg transition-all duration-300 ease-in-out"
          gradientSize={300}
          gradientColor="#3B82F6"
          gradientOpacity={0.2}
        >
          {isInitialLoading ? (
            <ProfileHeaderSkeleton />
          ) : (
            <ProfileHeader
              profileData={profileInformationData}
              activeUserData={activeUser}
            />
          )}

          <AccountInformation
            isInitialLoading={isInitialLoading}
            activeUserData={activeUser}
            profileInformationData={profileInformationData}
            setProfileInformationData={setProfileInformationData}
            selectedJobRole={selectedJobRole}
            setSelectedJobRole={setSelectedJobRole}
            cityInput={cityInput}
            setCityInput={setCityInput}
            cities={cities}
            isLoadingCities={isLoadingCities}
            cityError={cityError}
            handleCitySelect={handleCitySelect}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            review={review}
            rating={rating}
            handleReviewChange={handleReviewChange}
            setRating={setRating}
          />

          <div className="mt-8 flex justify-end">
            {isInitialLoading ? (
              <Skeleton className="w-32 h-10 rounded-md bg-gray-700" />
            ) : (
              <Button
                className="bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 text-white font-semibold py-2 px-6 rounded-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                onClick={handleProfileUpdate}
                disabled={isPending}
              >
                Save Changes
              </Button>
            )}
          </div>
        </MagicCard>
      </div>
    </AnimatedLoadWrapper>
  );
}
