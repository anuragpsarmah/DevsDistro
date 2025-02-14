import { ProfileHeaderProps } from "../utils/types";
import { Briefcase, MapPin } from "lucide-react";

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profileData,
  activeUserData,
}) => (
  <div className="flex flex-col md:flex-row items-center md:items-start mb-8">
    <div className="relative mb-6 md:mb-0 md:mr-8">
      <div className="w-40 h-40 rounded-full overflow-hidden ring-1 ring-purple-400 ring-offset-4 ring-offset-gray-800">
        <img
          src={activeUserData.profileImageUrl}
          alt="User Avatar"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
    <div className="text-center md:text-left">
      <h2 className="text-3xl font-bold text-gray-100 mb-2">
        {activeUserData.username}
      </h2>
      {profileData.jobRole && (
        <p className="text-gray-400 flex items-center justify-center md:justify-start mb-2">
          <Briefcase className="w-4 h-4 mr-2" />
          {profileData.jobRole}
        </p>
      )}
      {profileData.location && (
        <p className="text-gray-400 flex items-center justify-center md:justify-start">
          <MapPin className="w-4 h-4 mr-2" />
          {profileData.location}
        </p>
      )}
    </div>
  </div>
);
