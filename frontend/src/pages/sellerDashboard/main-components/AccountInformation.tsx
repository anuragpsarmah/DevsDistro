import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { JOB_ROLES } from "../utils/constants";
import { AccountInformationProps } from "../utils/types";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  FormFieldSkeleton,
  ReviewSectionSkeleton,
} from "../sub-components/Skeletons";
import { CitySearchInput } from "../sub-components/CitySearchInput";
import { ReviewSection } from "../sub-components/ReviewSection";

export default function AccountInformation({
  isInitialLoading,
  activeUserData,
  profileInformationData,
  setProfileInformationData,
  selectedJobRole,
  setSelectedJobRole,
  cityInput,
  setCityInput,
  cities,
  isLoadingCities,
  cityError,
  handleCitySelect,
  showSuggestions,
  setShowSuggestions,
  review,
  rating,
  handleReviewChange,
  setRating,
}: AccountInformationProps) {
  return (
    <>
      <Separator className="my-8 bg-gray-700" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <div className="space-y-6">
          {isInitialLoading ? (
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
                  value={activeUserData.username}
                  readOnly
                  className="bg-white/5 border-white/10 text-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-indigo-500/50 transition-colors duration-200"
                />
              </div>

              <div>
                <Label htmlFor="name" className="text-gray-300 mb-2 block">
                  Name
                </Label>
                <Input
                  id="name"
                  value={
                    activeUserData.name ||
                    "Name not available. Update your GitHub profile."
                  }
                  readOnly
                  className="bg-white/5 border-white/10 text-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-indigo-500/50 transition-colors duration-200"
                />
              </div>

              <div>
                <Label htmlFor="job-role" className="text-gray-300 mb-2 block">
                  Job Role
                </Label>
                <Select
                  value={selectedJobRole}
                  onValueChange={setSelectedJobRole}
                >
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-colors duration-200 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-indigo-500/50">
                    <SelectValue placeholder="Select a job role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14152b]/90 border-white/10 text-white backdrop-blur-xl">
                    {JOB_ROLES.map((role) => (
                      <SelectItem 
                        key={role} 
                        value={role}
                        className="focus:bg-white/10 hover:bg-white/10 cursor-pointer text-gray-300 focus:text-white"
                      >
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
        {isInitialLoading ? (
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
              Allow others to see your profile details and listings
            </p>
          </div>
          {isInitialLoading ? (
            <div className="w-10 h-6">
              <Skeleton className="w-full h-full rounded-full bg-gray-700" />
            </div>
          ) : (
            <Switch
              checked={profileInformationData.profile_visibility}
              onCheckedChange={(checked: boolean) => {
                setProfileInformationData((prev) => ({
                  ...prev,
                  profile_visibility: checked,
                }));
              }}
              className="data-[state=checked]:bg-blue-950 data-[state=unchecked]:bg-white/20 border-white/10 hover:border-white/20"
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-200">
              Auto-repackage on code change
            </h3>
            <p className="text-sm text-gray-400">
              Automatically repackage your listed projects when you push code changes to GitHub
            </p>
          </div>
          {isInitialLoading ? (
            <div className="w-10 h-6">
              <Skeleton className="w-full h-full rounded-full bg-gray-700" />
            </div>
          ) : (
            <Switch
              checked={profileInformationData.auto_repackage_on_push}
              onCheckedChange={(checked: boolean) => {
                setProfileInformationData((prev) => ({
                  ...prev,
                  auto_repackage_on_push: checked,
                }));
              }}
              className="data-[state=checked]:bg-blue-950 data-[state=unchecked]:bg-white/20 border-white/10 hover:border-white/20"
            />
          )}
        </div>
      </div>
    </>
  );
}
