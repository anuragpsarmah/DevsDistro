import { ProfileHeaderProps } from "../utils/types";
import { Briefcase, MapPin } from "lucide-react";

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profileData,
  activeUserData,
}) => (
  <div className="flex flex-col md:flex-row items-center md:items-start mb-8">
    <div className="relative mb-6 md:mb-0 md:mr-8">
      <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-2 ring-purple-500/50 ring-offset-4 ring-offset-gray-900">
        <img
          src={activeUserData.profile_image_url}
          alt="User Avatar"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
    <div className="text-center md:text-left flex-1 py-2">
      <h2 className="text-3xl font-bold text-gray-100 mb-3">
        {activeUserData.username}
      </h2>
      <div className="space-y-2">
        {profileData.job_role && (
          <p className="text-gray-400 flex items-center justify-center md:justify-start gap-2">
            <Briefcase className="w-4 h-4 text-gray-500" />
            {profileData.job_role}
          </p>
        )}
        {profileData.location && (
          <p className="text-gray-400 flex items-center justify-center md:justify-start gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            {profileData.location}
          </p>
        )}
      </div>
    </div>
  </div>
);
