import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useHandleError } from "./useHandleErrors";
import { errorToast, successToast } from "@/components/ui/customToast";
import { User, ProfileUpdateData, walletAddressData } from "@/utils/types";
import { tryCatch } from "@/utils/tryCatch.util";

const backend_uri = import.meta.env.VITE_BACKEND_URI;

interface queryParameter {
  logout?: () => Promise<void>;
}

const useAuthValidationQuery = () => {
  return useQuery({
    queryKey: ["authValidation"],
    queryFn: async () => {
      const response = await axios.get<{ data: User }>(
        `${backend_uri}/auth/authValidation`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
  });
};

const useLogoutQuery = () => {
  return useQuery({
    queryKey: ["logoutQuery"],
    queryFn: async () => {
      const [, error] = await tryCatch(
        axios.get(`${backend_uri}/auth/githubLogout`, {
          withCredentials: true,
        })
      );

      if (error) errorToast("Something went wrong. You are still logged in.");
    },
    enabled: false,
  });
};

const useUserCurrencyQuery = () => {
  return useQuery({
    queryKey: ["userCurrency"],
    queryFn: async () => {
      const response = await axios.get("https://ipapi.co/json/");
      return {
        country: response.data.country_name,
        currency: response.data.currency,
      };
    },
    staleTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
  });
};

const useCommonSalesInformationQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });

  return useQuery({
    queryKey: ["commonSalesInformationQuery"],
    queryFn: async () => {
      const [response, error] = await tryCatch(
        axios.get(`${backend_uri}/sales/getCommonSalesInformation`, {
          withCredentials: true,
        })
      );

      if (error) {
        await handleError(error);
        throw error;
      }
      return response.data;
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

      const [response, error] = await tryCatch(
        axios.get(
          `${backend_uri}/sales/getYearlySalesInformation?year=${year}`,
          {
            withCredentials: true,
          }
        )
      );

      if (error) {
        await handleError(error);
        throw error;
      }
      return response.data;
    },
    refetchOnWindowFocus: false,
  });
};

const useProfileInformationQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });
  return useQuery({
    queryKey: ["useProfileInformationQuery"],
    queryFn: async () => {
      const [response, error] = await tryCatch(
        axios.get<{ data: ProfileUpdateData }>(
          `${backend_uri}/profile/getProfileInformation`,
          {
            withCredentials: true,
          }
        )
      );

      if (error) {
        await handleError(error);
        throw error;
      }
      return response.data;
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
        if (response.data.data[response.data.data.length - 1].isRateLimited)
          successToast(
            response.data.message || "Too many requests. Cached data fetched."
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
  const getData = async (github_repo_id: string) => {
    try {
      const response = await axios.get(
        `${backend_uri}/projects/getSpecificProjectData?github_repo_id=${github_repo_id}`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  return getData;
};

const useGetWalletAddress = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });

  return useQuery({
    queryKey: ["getWalletAddressQuery"],
    queryFn: async () => {
      const [response, error] = await tryCatch(
        axios.get<{ data: walletAddressData }>(
          `${backend_uri}/profile/getWalletAddress`,
          {
            withCredentials: true,
          }
        )
      );

      if (error) {
        handleError(error);
        throw error;
      }
      return response.data;
    },
    refetchOnWindowFocus: false,
  });
};

export {
  useAuthValidationQuery,
  useLogoutQuery,
  useUserCurrencyQuery,
  useCommonSalesInformationQuery,
  useYearlySalesInformationQuery,
  useProfileInformationQuery,
  useFeaturedReviewQuery,
  useTotalListedProjectsQuery,
  usePrivateReposQuery,
  useInitialProjectDataQuery,
  useSpecificProjectDataQuery,
  useGetWalletAddress,
};
