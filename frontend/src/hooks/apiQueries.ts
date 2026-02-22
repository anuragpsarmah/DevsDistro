import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import { useHandleError } from "./useHandleErrors";
import { errorToast, successToast } from "@/components/ui/customToast";
import {
  User,
  ProfileUpdateData,
  walletAddressData,
  MarketplaceSearchParams,
  MarketplaceSearchResponse,
} from "@/utils/types";
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
      const [response, error] = await tryCatch(
        axios.get(`${backend_uri}/projects/getTotalListedProjects`, {
          withCredentials: true,
        })
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

const useInstallationStatusQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });
  return useQuery({
    queryKey: ["installationStatusQuery"],
    queryFn: async () => {
      const [response, error] = await tryCatch(
        axios.get(`${backend_uri}/github-app/status`, {
          withCredentials: true,
        })
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

const usePrivateReposInfiniteQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });
  return useInfiniteQuery({
    queryKey: ["privateRepoQuery"],
    queryFn: async ({ pageParam }) => {
      const [response, error] = await tryCatch(
        axios.get(`${backend_uri}/projects/getPrivateRepos?page=${pageParam}`, {
          withCredentials: true,
        })
      );

      if (error) {
        handleError(error);
        throw error;
      }

      const data = response.data.data;

      if (data?.needsInstallation) {
        return {
          repos: [],
          page: 1,
          hasMore: false,
          totalCount: 0,
          needsInstallation: true,
        };
      }

      if (data?.isRateLimited) {
        successToast(
          response.data.message || "Too many requests. Cached data fetched."
        );
      }

      return data as {
        repos: Array<{
          github_repo_id: string;
          name: string;
          description: string;
          language: string;
          updated_at: string;
          installation_id: number;
        }>;
        page: number;
        hasMore: boolean;
        totalCount: number;
        needsInstallation?: boolean;
        isRateLimited?: boolean;
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage?.needsInstallation) return undefined;
      if (lastPage?.hasMore) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
    refetchOnWindowFocus: false,
  });
};

const useInitialProjectDataQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });
  return useQuery({
    queryKey: ["initialProjectDataQuery"],
    queryFn: async () => {
      const [response, error] = await tryCatch(
        axios.get(`${backend_uri}/projects/getInitialProjectData`, {
          withCredentials: true,
        })
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

const useSpecificProjectDataQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });
  const getData = async (github_repo_id: string) => {
    const [response, error] = await tryCatch(
      axios.get(
        `${backend_uri}/projects/getSpecificProjectData?github_repo_id=${github_repo_id}`,
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

const useRepoZipStatusQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });

  const getStatus = async (github_repo_id: string) => {
    const [response, error] = await tryCatch(
      axios.get(
        `${backend_uri}/projects/getRepoZipStatus?github_repo_id=${github_repo_id}`,
        { withCredentials: true }
      )
    );

    if (error) {
      handleError(error);
      throw error;
    }
    return response.data;
  };

  return getStatus;
};

const useMarketplaceSearchQuery = (
  params: MarketplaceSearchParams,
  { logout }: queryParameter
) => {
  const { handleError } = useHandleError({ logout });
  const limit = params.limit || 12;

  return useInfiniteQuery({
    queryKey: ["marketplaceSearch", params],
    queryFn: async ({ pageParam = 0 }) => {
      const [response, error] = await tryCatch(
        axios.post<MarketplaceSearchResponse>(
          `${backend_uri}/projects/search`,
          {
            searchTerm: params.searchTerm || "",
            projectTypes: params.projectTypes || [],
            techStack: params.techStack || [],
            minPrice: params.minPrice,
            maxPrice: params.maxPrice,
            sortBy: params.sortBy || "newest",
            limit,
            offset: pageParam,
          },
          { withCredentials: true }
        )
      );

      if (error) {
        await handleError(error);
        throw error;
      }

      return response.data.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage?.pagination.hasNextPage) {
        return lastPage.pagination.offset + limit;
      }
      return undefined;
    },
    initialPageParam: 0,
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
  useInstallationStatusQuery,
  usePrivateReposInfiniteQuery,
  useInitialProjectDataQuery,
  useSpecificProjectDataQuery,
  useGetWalletAddress,
  useRepoZipStatusQuery,
  useMarketplaceSearchQuery,
};
