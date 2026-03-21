import {
  useQuery,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import axios from "axios";
import { apiClient } from "@/lib/axiosInstance";
import { useHandleError } from "./useHandleErrors";
import { errorToast, successToast } from "@/components/ui/customToast";
import {
  User,
  ProfileUpdateData,
  walletAddressData,
  MarketplaceSearchParams,
  MarketplaceSearchResponse,
  ProjectDetail,
  MarketplaceProject,
  PurchasedProject,
  ProjectReview,
  ReviewsResponse,
  SellerSalesTransactionsResponse,
} from "@/utils/types";
import { tryCatch } from "@/utils/tryCatch.util";

interface queryParameter {
  logout?: () => Promise<void>;
}

interface SellerSalesTransactionsParams {
  limit?: number;
  date_preset: "all" | "7d" | "30d" | "thisYear";
  project_filter: string;
  cursor_created_at?: string;
  cursor_id?: string;
}

type SellerSalesCursor = {
  cursor_created_at: string;
  cursor_id: string;
} | null;

const useAuthValidationQuery = () => {
  return useQuery({
    queryKey: ["authValidation"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: User }>(
        "/auth/authValidation"
      );
      return response.data;
    },
  });
};

const useLogoutQuery = () => {
  return useQuery({
    queryKey: ["logoutQuery"],
    queryFn: async () => {
      const [, error] = await tryCatch(apiClient.post("/auth/githubLogout"));

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
        apiClient.get("/sales/getCommonSalesInformation")
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
        apiClient.get(`/sales/getYearlySalesInformation?year=${year}`)
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
        apiClient.get<{ data: ProfileUpdateData }>(
          "/profile/getProfileInformation"
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
      const response = await apiClient.get("/reviews/getFeaturedReviews");
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
        apiClient.get("/projects/getTotalListedProjects")
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
        apiClient.get("/github-app/status")
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
        apiClient.get(`/projects/getPrivateRepos?page=${pageParam}`)
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
        apiClient.get("/projects/getInitialProjectData")
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
      apiClient.get(
        `/projects/getSpecificProjectData?github_repo_id=${github_repo_id}`
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
        apiClient.get<{ data: walletAddressData }>("/profile/getWalletAddress")
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
      apiClient.get(
        `/projects/getRepoZipStatus?github_repo_id=${github_repo_id}`
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
        apiClient.post<MarketplaceSearchResponse>("/projects/search", {
          searchTerm: params.searchTerm || "",
          projectTypes: params.projectTypes || [],
          techStack: params.techStack || [],
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          sortBy: params.sortBy || "newest",
          limit,
          offset: pageParam,
        })
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

const useProjectDetailQuery = (
  projectId: string,
  { logout }: queryParameter
) => {
  const { handleError } = useHandleError({ logout });

  return useQuery({
    queryKey: ["projectDetail", projectId],
    queryFn: async () => {
      const [response, error] = await tryCatch(
        apiClient.get<{ data: ProjectDetail }>(
          `/projects/getMarketplaceProjectDetail?project_id=${projectId}`
        )
      );

      if (error) {
        await handleError(error);
        throw error;
      }

      return response.data.data;
    },
    enabled: !!projectId,
    refetchOnWindowFocus: false,
  });
};

const useGetWishlistQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });

  return useQuery({
    queryKey: ["wishlistQuery"],
    queryFn: async () => {
      const [response, error] = await tryCatch(
        apiClient.get<{ data: { projects: MarketplaceProject[] } }>(
          "/wishlist/getWishlist"
        )
      );

      if (error) {
        await handleError(error);
        throw error;
      }

      return response.data.data.projects;
    },
    refetchOnWindowFocus: false,
  });
};

const useGetPurchasedProjectsQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });

  return useQuery({
    queryKey: ["purchasedProjectsQuery"],
    queryFn: async () => {
      const [response, error] = await tryCatch(
        apiClient.get<{ data: { purchases: PurchasedProject[] } }>(
          "/purchases/getPurchasedProjects"
        )
      );

      if (error) {
        await handleError(error);
        throw error;
      }

      return response.data.data.purchases;
    },
    refetchOnWindowFocus: false,
  });
};

const useGetProjectReviewsQuery = (
  projectId: string,
  offset: number,
  limit: number = 10
) => {
  return useQuery({
    queryKey: ["projectReviews", projectId, offset, limit],
    queryFn: async () => {
      const [response, error] = await tryCatch(
        apiClient.get<{ data: ReviewsResponse }>(
          `/reviews/project?project_id=${projectId}&offset=${offset}&limit=${limit}`
        )
      );

      if (error) throw error;
      return response.data.data;
    },
    enabled: !!projectId,
    refetchOnWindowFocus: false,
  });
};

const useGetMyProjectReviewQuery = (
  projectId: string,
  enabled: boolean,
  { logout }: queryParameter
) => {
  const { handleError } = useHandleError({ logout });

  return useQuery({
    queryKey: ["myProjectReview", projectId],
    queryFn: async () => {
      const [response, error] = await tryCatch(
        apiClient.get<{ data: { review: ProjectReview | null } }>(
          `/reviews/my-review?project_id=${projectId}`
        )
      );

      if (error) {
        await handleError(error);
        throw error;
      }
      return response.data.data.review;
    },
    enabled: !!projectId && enabled,
    refetchOnWindowFocus: false,
  });
};

interface WishlistPaginationMeta {
  totalCount: number;
  limit: number;
  offset: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  currentPage: number;
  totalPages: number;
}

const BUYER_PAGE_LIMIT = 12;

const useGetWishlistCountQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });

  return useQuery({
    queryKey: ["wishlistCount"],
    queryFn: async () => {
      const [response, error] = await tryCatch(
        apiClient.get<{ data: { count: number } }>("/wishlist/count")
      );

      if (error) {
        await handleError(error);
        throw error;
      }

      return response.data.data.count;
    },
    refetchOnWindowFocus: false,
  });
};

const useGetWishlistInfiniteQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });

  return useInfiniteQuery({
    queryKey: ["wishlistInfinite"],
    queryFn: async ({ pageParam = 0 }) => {
      const [response, error] = await tryCatch(
        apiClient.get<{
          data: {
            projects: MarketplaceProject[];
            pagination: WishlistPaginationMeta;
          };
        }>(
          `/wishlist/getWishlist?limit=${BUYER_PAGE_LIMIT}&offset=${pageParam}`
        )
      );

      if (error) {
        await handleError(error);
        throw error;
      }

      return response.data.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage?.pagination?.hasNextPage) {
        return lastPage.pagination.offset + BUYER_PAGE_LIMIT;
      }
      return undefined;
    },
    initialPageParam: 0,
    refetchOnWindowFocus: false,
  });
};

const useGetPurchasedProjectsInfiniteQuery = ({ logout }: queryParameter) => {
  const { handleError } = useHandleError({ logout });

  return useInfiniteQuery({
    queryKey: ["purchasedProjectsInfinite"],
    queryFn: async ({ pageParam = 0 }) => {
      const [response, error] = await tryCatch(
        apiClient.get<{
          data: {
            purchases: PurchasedProject[];
            pagination: WishlistPaginationMeta;
          };
        }>(
          `/purchases/getPurchasedProjects?limit=${BUYER_PAGE_LIMIT}&offset=${pageParam}`
        )
      );

      if (error) {
        await handleError(error);
        throw error;
      }

      return response.data.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage?.pagination?.hasNextPage) {
        return lastPage.pagination.offset + BUYER_PAGE_LIMIT;
      }
      return undefined;
    },
    initialPageParam: 0,
    refetchOnWindowFocus: false,
  });
};

const useGetSellerSalesTransactionsInfiniteQuery = (
  params: SellerSalesTransactionsParams,
  { logout }: queryParameter
) => {
  const { handleError } = useHandleError({ logout });
  const limit = params.limit || 20;

  return useInfiniteQuery<
    SellerSalesTransactionsResponse,
    Error,
    InfiniteData<SellerSalesTransactionsResponse, SellerSalesCursor>,
    [string, SellerSalesTransactionsParams],
    SellerSalesCursor
  >({
    queryKey: ["sellerSalesTransactionsQuery", params],
    queryFn: async ({ pageParam }: { pageParam: SellerSalesCursor }) => {
      const cursor = pageParam;
      const [response, error] = await tryCatch(
        apiClient.get<{ data: SellerSalesTransactionsResponse }>(
          "/sales/getSalesTransactions",
          {
            params: {
              limit,
              date_preset: params.date_preset,
              project_filter: params.project_filter,
              cursor_created_at: cursor?.cursor_created_at,
              cursor_id: cursor?.cursor_id,
            },
          }
        )
      );

      if (error) {
        await handleError(error);
        throw error;
      }

      return response.data.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage?.has_more && lastPage?.next_cursor) {
        return lastPage.next_cursor;
      }
      return undefined;
    },
    initialPageParam: null as SellerSalesCursor,
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 0,
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
  useProjectDetailQuery,
  useGetWishlistQuery,
  useGetWishlistCountQuery,
  useGetWishlistInfiniteQuery,
  useGetPurchasedProjectsQuery,
  useGetPurchasedProjectsInfiniteQuery,
  useGetProjectReviewsQuery,
  useGetMyProjectReviewQuery,
  useGetSellerSalesTransactionsInfiniteQuery,
};
