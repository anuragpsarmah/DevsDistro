import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useHandleError } from "./useHandleErrors";
import { errorToast } from "@/components/ui/customToast";

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
      try {
        const response = await axios.get(`${backend_uri}/auth/githubLogout`, {
          withCredentials: true,
        });
        return response.data;
      } catch {
        errorToast("Something went wrong. You are still logged in.");
      }
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
    refetchOnWindowFocus: false,
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
    refetchOnWindowFocus: false,
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
    refetchOnWindowFocus: false,
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
    refetchOnWindowFocus: false,
  });
};

const useTotalListedProjectsQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });
  return useQuery({
    queryKey: ["totalListedProjectsQuery"],
    queryFn: async () => {
      try {
        const response = await axios.get(
          `${backend_uri}/projects/getTotalListedProjects`,
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
    refetchOnWindowFocus: false,
  });
};

const usePrivateReposQuery = (
  refreshStatus: string,
  { logout }: queryParameter
) => {
  const { handleError } = useHandleError({ logout });
  return useQuery({
    queryKey: ["privateRepoQuery", refreshStatus],
    queryFn: async ({ queryKey }) => {
      try {
        const [, refreshStatus] = queryKey;
        const response = await axios.get(
          `${backend_uri}/projects/getPrivateRepos?refreshStatus=${refreshStatus}`,
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
    refetchOnWindowFocus: false,
  });
};

const useInitialProjectDataQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });
  return useQuery({
    queryKey: ["initialProjectDataQuery"],
    queryFn: async () => {
      try {
        const response = await axios.get(
          `${backend_uri}/projects/getInitialProjectData`,
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
    refetchOnWindowFocus: false,
  });
};

const useSpecificProjectDataQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });
  return useQuery({
    queryKey: ["specificProjectDataQuery"],
    queryFn: async () => {
      try {
        const response = await axios.get(
          `${backend_uri}/projects/getSpecificProjectData`,
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
    refetchOnWindowFocus: false,
  });
};

export {
  useAuthValidationQuery,
  useLogoutQuery,
  useCommonSalesInformationQuery,
  useYearlySalesInformationQuery,
  useProfileInformationQuery,
  useFeaturedReviewQuery,
  useTotalListedProjectsQuery,
  usePrivateReposQuery,
  useInitialProjectDataQuery,
  useSpecificProjectDataQuery,
};
