import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { JOB_ROLES, MAX_BIO_LENGTH } from "../utils/constants";
import { AccountInformationProps } from "../utils/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  FormFieldSkeleton,
  ReviewSectionSkeleton,
} from "../sub-components/Skeletons";
import { CitySearchInput } from "../sub-components/CitySearchInput";
import { ReviewSection } from "../sub-components/ReviewSection";
import { DeleteAccountModal } from "../sub-components/DeleteAccountModal";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AccountInformation({
  isInitialLoading,
  isSaving,
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <div className="w-full h-[2px] bg-black/10 dark:bg-white/10 my-12" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
        <div className="flex flex-col h-full">
          <div className="p-6 lg:p-10 border-2 border-black/10 dark:border-white/10 h-full flex flex-col space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-[2px] bg-red-500"></div>
              <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
                Public Identity
              </span>
            </div>
            {isInitialLoading ? (
              <div className="space-y-8">
                <FormFieldSkeleton />
                <FormFieldSkeleton />
                <FormFieldSkeleton />
                <FormFieldSkeleton />
                <FormFieldSkeleton />
                <FormFieldSkeleton />
                <FormFieldSkeleton />
              </div>
            ) : (
              <div className="space-y-8 flex flex-col">
                <div>
                  <Label
                    htmlFor="github-username"
                    className="font-space font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs text-black/50 dark:text-white/50 mb-3 block"
                  >
                    GitHub Username
                  </Label>
                  <Input
                    id="github-username"
                    value={activeUserData.username}
                    readOnly
                    className="bg-black/5 dark:bg-white/5 border-2 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-red-500 focus:ring-0 rounded-none transition-colors duration-300 p-4 font-space h-auto cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="name"
                    className="font-space font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs text-black/50 dark:text-white/50 mb-3 block"
                  >
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={
                      activeUserData.name ||
                      "Name not available. Update your GitHub profile."
                    }
                    readOnly
                    className="bg-black/5 dark:bg-white/5 border-2 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-red-500 focus:ring-0 rounded-none transition-colors duration-300 p-4 font-space h-auto cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="job-role"
                    className="font-space font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs text-black/50 dark:text-white/50 mb-3 block"
                  >
                    Job Role
                  </Label>
                  <Select
                    value={selectedJobRole}
                    onValueChange={setSelectedJobRole}
                  >
                    <SelectTrigger className="w-full bg-transparent border-2 border-black/20 dark:border-white/20 text-black dark:text-white hover:border-black dark:hover:border-white transition-colors duration-300 focus:ring-0 focus:border-red-500 rounded-none h-auto p-4 font-space">
                      <SelectValue placeholder="Select a job role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#050505] border-2 border-black dark:border-white rounded-none">
                      {JOB_ROLES.map((role) => (
                        <SelectItem
                          key={role}
                          value={role}
                          className="focus:bg-black/5 dark:focus:bg-white/10 cursor-pointer font-space text-sm text-black dark:text-white rounded-none"
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

                <div>
                  <Label
                    htmlFor="website-url"
                    className="font-space font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs text-black/50 dark:text-white/50 mb-3 block"
                  >
                    Website / Portfolio URL
                  </Label>
                  <Input
                    id="website-url"
                    placeholder="https://"
                    value={profileInformationData.website_url}
                    onChange={(e) =>
                      setProfileInformationData((prev) => ({
                        ...prev,
                        website_url: e.target.value,
                      }))
                    }
                    className="bg-transparent border-2 border-black/20 dark:border-white/20 text-black dark:text-white hover:border-black dark:hover:border-white focus:border-red-500 focus:ring-0 rounded-none transition-colors duration-300 p-4 font-space h-auto"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="x-username"
                    className="font-space font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs text-black/50 dark:text-white/50 mb-3 block"
                  >
                    X (Twitter) Username
                  </Label>
                  <Input
                    id="x-username"
                    placeholder="@username"
                    value={profileInformationData.x_username}
                    onChange={(e) =>
                      setProfileInformationData((prev) => ({
                        ...prev,
                        x_username: e.target.value,
                      }))
                    }
                    className="bg-transparent border-2 border-black/20 dark:border-white/20 text-black dark:text-white hover:border-black dark:hover:border-white focus:border-red-500 focus:ring-0 rounded-none transition-colors duration-300 p-4 font-space h-auto"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="short-bio"
                    className="font-space font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs text-black/50 dark:text-white/50 mb-3 block"
                  >
                    Short Bio
                  </Label>
                  <Textarea
                    id="short-bio"
                    placeholder="Briefly describe your expertise..."
                    value={profileInformationData.short_bio}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_BIO_LENGTH) {
                        setProfileInformationData((prev) => ({
                          ...prev,
                          short_bio: e.target.value,
                        }));
                      }
                    }}
                    className="bg-transparent border-2 border-black/20 dark:border-white/20 text-black dark:text-white hover:border-black dark:hover:border-white focus:border-red-500 focus:ring-0 rounded-none transition-colors duration-300 p-4 font-space h-32 resize-none placeholder:text-black/30 placeholder:dark:text-white/30"
                  />
                  <div className="flex justify-between items-center mt-3">
                    <p className="font-space font-bold text-[10px] uppercase tracking-widest text-gray-500">
                      Keep it brief.
                    </p>
                    <p
                      className={`font-space font-bold text-[10px] uppercase tracking-widest ${
                        MAX_BIO_LENGTH -
                          profileInformationData.short_bio.length <=
                        20
                          ? "text-red-500"
                          : "text-gray-500"
                      }`}
                    >
                      {profileInformationData.short_bio.length}/{MAX_BIO_LENGTH}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col h-full space-y-8">
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
          <div className="mt-12 flex flex-col flex-1 space-y-8">
            <div className="flex items-start justify-between gap-6 p-6 border-2 border-black/10 dark:border-white/10">
              <div>
                <h3 className="font-syne text-xl uppercase tracking-widest font-bold text-black dark:text-white mb-2">
                  Profile Visibility
                </h3>
                <p className="font-space text-sm text-gray-600 dark:text-gray-400">
                  Allow others to see your profile details.
                </p>
              </div>
              {isInitialLoading ? (
                <div className="w-12 h-6">
                  <Skeleton className="w-full h-full rounded-none bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20" />
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
                  disabled={isSaving}
                  className="data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-black/20 dark:data-[state=unchecked]:bg-white/20 border-2 border-transparent hover:border-black dark:hover:border-white rounded-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              )}
            </div>

            <div className="flex items-start justify-between gap-6 p-6 border-2 border-black/10 dark:border-white/10">
              <div>
                <h3 className="font-syne text-xl uppercase tracking-widest font-bold text-black dark:text-white mb-2">
                  Auto-repackage on repository updates
                </h3>
                <p className="font-space text-sm text-gray-600 dark:text-gray-400">
                  Automatically repackage your listed projects when you push
                  repository updates to GitHub.
                </p>
              </div>
              {isInitialLoading ? (
                <div className="w-12 h-6">
                  <Skeleton className="w-full h-full rounded-none bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20" />
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
                  disabled={isSaving}
                  className="data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-black/20 dark:data-[state=unchecked]:bg-white/20 border-2 border-transparent hover:border-black dark:hover:border-white rounded-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              )}
            </div>

            <div className="flex flex-col justify-between gap-6 p-6 border-2 border-red-500 bg-red-500/5 mt-auto flex-1">
              <div>
                <h3 className="font-syne text-xl uppercase tracking-widest font-bold text-red-500 mb-3 flex items-center gap-3">
                  <div className="w-8 h-[2px] bg-red-500"></div>
                  Danger Zone
                </h3>
                <p className="font-space text-sm lg:text-[15px] font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                  Proceeding will permanently delete your DevsDistro account,
                  wipe all personal profile data, and unlist any active
                  repositories from the marketplace.{" "}
                  <strong className="text-red-500 dark:text-red-400">
                    This action is irreversible.
                  </strong>
                </p>
              </div>

              <div className="pt-6 border-t-2 border-red-500/20 mt-auto">
                {isInitialLoading ? (
                  <div className="w-48 h-12">
                    <Skeleton className="w-full h-full rounded-none bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20" />
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="w-full sm:w-auto self-start bg-red-500 text-white border-2 border-red-500 hover:bg-black hover:border-black dark:hover:bg-white dark:hover:border-white dark:hover:text-black transition-all duration-300 rounded-none font-space uppercase tracking-widest font-bold text-xs py-5 px-8"
                  >
                    Delete Account
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
      />
    </>
  );
}
