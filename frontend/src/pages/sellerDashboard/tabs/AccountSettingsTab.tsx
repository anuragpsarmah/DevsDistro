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
      website_url: profileInformationData.website_url,
      x_username: profileInformationData.x_username,
      short_bio: profileInformationData.short_bio,
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
      <div className="flex flex-col min-h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] lg:min-h-0 mt-10 lg:mt-0 pb-12 lg:pb-6 w-full">
        <div className="flex-shrink-0 mb-8 lg:mb-10 w-full">
          <div className="flex items-center gap-3 mb-6 w-full">
            <div className="w-12 h-[2px] bg-red-500"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              Settings
            </span>
          </div>
          <div className="text-left w-full max-w-4xl">
            <h1 className="font-syne uppercase tracking-widest text-4xl lg:text-5xl font-black text-black dark:text-white leading-none break-words hyphens-auto transition-colors duration-300">
              Account Settings
            </h1>
            <p className="font-space text-lg text-gray-600 dark:text-gray-400 mt-4 leading-relaxed transition-colors duration-300 max-w-2xl">
              Manage your profile and system preferences.
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0 w-full relative">
          <div className="relative h-full bg-white dark:bg-[#050505] transition-colors duration-300 flex flex-col">
            <div className="relative z-10 h-full overflow-y-auto p-4 lg:p-8 xl:p-12 border-2 border-black dark:border-white custom-scrollbar">
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

              <div className="mt-16 flex justify-end">
                {isInitialLoading ? (
                  <Skeleton className="w-40 h-14 rounded-none bg-black/10 dark:bg-white/10" />
                ) : (
                  <Button
                    className="px-8 py-4 bg-black text-white dark:bg-white dark:text-black font-space font-bold uppercase tracking-widest text-[10px] md:text-sm rounded-none border-2 border-transparent hover:border-black dark:hover:border-white hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white transition-all duration-300"
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
