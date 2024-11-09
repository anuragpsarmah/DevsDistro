import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useHandleError } from "./useHandleErrors";

const backend_uri = import.meta.env.VITE_BACKEND_URI;

interface queryParameter {
  logout?: () => Promise<void>;
}

const useAuthValidationQuery = () => {
  return useQuery({
    queryKey: ["authValidation"],
    queryFn: async () => {
      const response = await axios.get(`${backend_uri}/auth/authValidation`, {
        withCredentials: true,
      });
      return response.data;
    },
  });
};

const useLogoutQuery = () => {
  return useQuery({
    queryKey: ["logoutQuery"],
    queryFn: async () => {
      const response = await axios.get(`${backend_uri}/auth/githubLogout`, {
        withCredentials: true,
      });
      return response.data;
    },
    enabled: false,
  });
};

const useCommonSalesInformationQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });

  return useQuery({
    queryKey: ["commonSalesInformationQuery"],
    queryFn: async () => {
      try {
        const response = await axios.get(
          `${backend_uri}/sales/getCommonSalesInformation`,
          {
            withCredentials: true,
          }
        );
        return response.data;
      } catch (error) {
        await handleError(error);
        throw error;
      }
    },
  });
};

const useYearlySalesInformationQuery = (
  year: number,
  { logout }: queryParameter
) => {
  const { handleError } = useHandleError({ logout });

  return useQuery({
    queryKey: ["yearlySalesInformationQuery", year],
    queryFn: async ({ queryKey }) => {
      const [, year] = queryKey;
      try {
        const response = await axios.get(
          `${backend_uri}/sales/getYearlySalesInformation?year=${year}`,
          {
            withCredentials: true,
          }
        );
        return response.data;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
  });
};

const useProfileInformationQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });
  return useQuery({
    queryKey: ["useProfileInformationQuery"],
    queryFn: async () => {
      try {
        const response = await axios.get(
          `${backend_uri}/profile/getProfileInformation`,
          { withCredentials: true }
        );

        return response.data;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
  });
};

const useFeaturedReviewQuery = () => {
  return useQuery({
    queryKey: ["featuredReviewQuery"],
    queryFn: async () => {
      const response = await axios.get(
        `${backend_uri}/reviews/getFeaturedReviews`
      );
      return response.data;
    },
  });
};

const usePrivateReposQuery = () => {
  return useQuery({
    queryKey: ["privateRepoQuery"],
    queryFn: async () => {
      const response = await axios.get(
        `${backend_uri}/projects/getPrivateRepos`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
  });
};

export {
  useAuthValidationQuery,
  useLogoutQuery,
  useCommonSalesInformationQuery,
  useYearlySalesInformationQuery,
  useProfileInformationQuery,
  useFeaturedReviewQuery,
  usePrivateReposQuery,
};
