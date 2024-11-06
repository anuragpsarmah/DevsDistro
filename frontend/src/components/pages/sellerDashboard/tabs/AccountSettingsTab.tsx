import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useProfileInformationQuery } from "@/hooks/apiQueries";
import { useProfileUpdateMutation } from "@/hooks/apiMutations";
import { ProfileHeader } from "../components/ProfileHeader";
import { CitySearchInput } from "../components/CitySearchInput";
import { ReviewSection } from "../components/ReviewSection";
import {
  ProfileHeaderSkeleton,
  FormFieldSkeleton,
  ReviewSectionSkeleton,
} from "../components/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { useCitySearch } from "../hooks/useCitySearch";
import {
  JOB_ROLES,
  MAX_REVIEW_LENGTH,
  INITIAL_PROFILE_INFORMATION_DATA,
} from "../utils/constants";
import type { ProfileInformation } from "../utils/types";

export default function AccountSettingsTab() {
  const [profileInformationData, setProfileInformationData] =
    useState<ProfileInformation>(INITIAL_PROFILE_INFORMATION_DATA);
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(0);
  const [cityInput, setCityInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedJobRole, setSelectedJobRole] = useState("");

  const backend_uri = import.meta.env.VITE_BACKEND_URI;

  const { cities, isLoadingCities, cityError } = useCitySearch({
    cityInput,
    backend_uri,
  });

  const {
    data: profileInformationQueryData,
    isLoading: profileInformationQueryLoading,
    isError: profileInformationQueryError,
  } = useProfileInformationQuery();

  const { mutate } = useProfileUpdateMutation();

  const handleProfileUpdate = () => {
    mutate({
      job_role: selectedJobRole,
      location: cityInput,
      review_description: review,
      review_stars: rating,
      profile_visibility: profileInformationData.profileVisibility,
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
      !profileInformationQueryLoading &&
      !profileInformationQueryError &&
      profileInformationQueryData?.data
    ) {
      setProfileInformationData(profileInformationQueryData.data);
      setSelectedJobRole(profileInformationQueryData.data.jobRole);
      setRating(profileInformationQueryData.data.reviewStar);
      setReview(profileInformationQueryData.data.reviewDescription);
      setCityInput(profileInformationQueryData.data.location);
    }
  }, [
    profileInformationQueryData,
    profileInformationQueryLoading,
    profileInformationQueryError,
  ]);

  const isLoading = profileInformationQueryLoading;

  return (
    <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
      <h1 className="text-4xl text-center md:text-left lg:text-left font-bold mb-6 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
        Account Settings
      </h1>

      <div className="bg-gray-800 rounded-xl p-8 shadow-lg">
        {isLoading ? (
          <ProfileHeaderSkeleton />
        ) : (
          <ProfileHeader profileData={profileInformationData} />
        )}

        <Separator className="my-8 bg-gray-700" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {isLoading ? (
              <>
                <FormFieldSkeleton />
                <FormFieldSkeleton />
                <FormFieldSkeleton />
                <FormFieldSkeleton />
              </>
            ) : (
              <>
                <div>
                  <Label
                    htmlFor="github-username"
                    className="text-gray-300 mb-2 block"
                  >
                    GitHub Username
                  </Label>
                  <Input
                    id="github-username"
                    value={profileInformationData.username}
                    readOnly
                    className="bg-gray-700 text-gray-300 border-gray-600 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors"
                  />
                </div>

                <div>
                  <Label htmlFor="name" className="text-gray-300 mb-2 block">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={
                      profileInformationData.name ||
                      "Name not available. Update your GitHub profile."
                    }
                    readOnly
                    className="bg-gray-700 text-gray-300 border-gray-600 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="job-role"
                    className="text-gray-300 mb-2 block"
                  >
                    Job Role
                  </Label>
                  <Select
                    value={selectedJobRole}
                    onValueChange={setSelectedJobRole}
                  >
                    <SelectTrigger className="w-full bg-gray-700 text-gray-300 border-gray-600 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors">
                      <SelectValue placeholder="Select a job role" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 text-gray-300 border-gray-600">
                      {JOB_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <CitySearchInput
                  cityInput={cityInput}
                  onCityInputChange={setCityInput}
                  cities={cities}
                  isLoadingCities={isLoadingCities}
                  cityError={cityError}
                  onCitySelect={handleCitySelect}
                  showSuggestions={showSuggestions}
                  setShowSuggestions={setShowSuggestions}
                />
              </>
            )}
          </div>

          {isLoading ? (
            <ReviewSectionSkeleton />
          ) : (
            <ReviewSection
              review={review}
              rating={rating}
              onReviewChange={handleReviewChange}
              onRatingChange={setRating}
            />
          )}
        </div>

        <Separator className="my-8 bg-gray-700" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-200">
                Profile Visibility
              </h3>
              <p className="text-sm text-gray-400">
                Allow others to see your profile
              </p>
            </div>
            {isLoading ? (
              <div className="w-10 h-6">
                <Skeleton className="w-full h-full rounded-full bg-gray-700" />
              </div>
            ) : (
              <Switch
                checked={profileInformationData.profileVisibility}
                onCheckedChange={(checked: boolean) => {
                  setProfileInformationData((prev) => ({
                    ...prev,
                    profileVisibility: checked,
                  }));
                }}
              />
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          {isLoading ? (
            <Skeleton className="w-32 h-10 rounded-md bg-gray-700" />
          ) : (
            <Button
              className="bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 text-white font-semibold py-2 px-6 rounded-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
              onClick={handleProfileUpdate}
            >
              Save Changes
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
