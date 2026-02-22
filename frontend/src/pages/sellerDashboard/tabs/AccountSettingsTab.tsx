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
      auto_repackage_on_push: profileInformationData.auto_repackage_on_push,
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
      <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] mt-10 lg:mt-0 md:mt-0 pb-4 lg:pb-6">
        <div className="flex-shrink-0 mb-4 lg:mb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <div className="text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl text-left font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                Account Settings
              </h1>
              <p className="text-xs lg:text-sm text-gray-500">
                Manage your profile and preferences
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-2xl rounded-3xl pointer-events-none" />
          <div className="relative h-full bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none" />

            <div className="relative z-10 h-full overflow-y-auto p-4 lg:p-6 custom-scrollbar">
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

              <div className="mt-8 flex justify-end pb-4">
                {isInitialLoading ? (
                  <Skeleton className="w-32 h-10 rounded-xl bg-gray-700/50" />
                ) : (
                  <Button
                    className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 text-blue-100 border border-blue-500/20 hover:border-blue-500/40 font-medium py-2 px-6 rounded-xl transition-all duration-200"
                    onClick={handleProfileUpdate}
                    disabled={isPending}
                  >
                    Save Changes
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatedLoadWrapper>
  );
}
