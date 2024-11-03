export interface User {
  _id: string;
  username: string;
  name: string;
  profileImageUrl: string;
}

export type ProfileUpdateData = {
  job_role: string;
  location: string;
  review_description: string;
  review_stars: number;
  profile_visibility: boolean;
};
