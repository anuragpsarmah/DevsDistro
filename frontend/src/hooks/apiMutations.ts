import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useResetRecoilState } from "recoil";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/axiosInstance";
import { successToast } from "@/components/ui/customToast";
import {
  ProfileUpdateData,
  projectListingValidatedFormData,
  ProjectMediaMetadata,
  WalletUpdatePayload,
  PurchaseIntent,
  PurchaseConfirmPayload,
  SubmitReviewPayload,
} from "@/utils/types";
import { user, userCurrency } from "@/utils/atom";
import { useHandleError } from "./useHandleErrors";
import { tryCatch } from "@/utils/tryCatch.util";

interface mutationParameter {
  logout?: () => Promise<void>;
}

const useProfileUpdateMutation = ({ logout }: mutationParameter) => {
  const queryClient = useQueryClient();
  const { handleError } = useHandleError({ logout });

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      operationInProgress = true;

      const [response, error] = await tryCatch(
        apiClient.put("/profile/updateProfileInformation", data)
      );

      setTimeout(() => {
        operationInProgress = false;
        queryClient.invalidateQueries({
          queryKey: ["useProfileInformationQuery"],
        });
      }, 300);

      if (error) {
        handleError(error);
        throw error;
      }
      successToast("Profile updated successfully");
      return response.data;
    },
  });
};

const usePreSignedUrlForProjectMediaUploadMutation = ({
  logout,
}: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  let operationInProgress = false;

  return useMutation({
    mutationFn: async ({
      metadata,
      existingImageCount,
      existingVideoCount,
      modificationType,
      detailMetadata,
    }: {
      metadata: Array<ProjectMediaMetadata>;
      existingImageCount: number;
      existingVideoCount: number;
      modificationType: string;
      detailMetadata?: Array<ProjectMediaMetadata>;
    }) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      operationInProgress = true;

      const [response, error] = await tryCatch(
        apiClient.post("/projects/getPreSignedUrlForProjectMediaUpload", {
          metadata,
          existingImageCount,
          existingVideoCount,
          modificationType,
          ...(detailMetadata && detailMetadata.length > 0 ? { detailMetadata } : {}),
        })
      );

      operationInProgress = false;

      if (error) {
        handleError(error);
        throw error;
      }
      return response.data;
    },
  });
};

const useValidateMediaUploadAndStoreProjectMutation = ({
  logout,
}: mutationParameter) => {
  const { handleError } = useHandleError({ logout });
  const queryClient = useQueryClient();

  let operationInProgress = false;

  return useMutation({
    mutationFn: async ({
      projectData,
      modificationType,
    }: {
      projectData: projectListingValidatedFormData;
      modificationType: string;
    }) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      operationInProgress = true;

      const [response, error] = await tryCatch(
        apiClient.put("/projects/validateMediaUploadAndStoreProject", {
          projectData,
          modificationType,
        })
      );

      operationInProgress = false;

      if (error) {
        handleError(error);
        throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["totalListedProjectsQuery"] });
      queryClient.invalidateQueries({ queryKey: ["initialProjectDataQuery"] });
      return response.data;
    },
  });
};

const useToggleProjectListingMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (github_repo_id: string) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      operationInProgress = true;

      const [response, error] = await tryCatch(
        apiClient.patch("/projects/toggleProjectListing", { github_repo_id })
      );

      operationInProgress = false;

      if (error) {
        handleError(error);
        throw error;
      }
      successToast(
        response.data?.data?.status
          ? "Project was re-listed"
          : "Project was unlisted"
      );
      return response.data;
    },
  });
};

const useDeleteProjectListingMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });
  const queryClient = useQueryClient();

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (github_repo_id: string) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      operationInProgress = true;

      const [apiResponse, error] = await tryCatch(
        apiClient.delete(
          `/projects/deleteProjectListing?github_repo_id=${github_repo_id}`
        )
      );

      operationInProgress = false;

      if (error) {
        handleError(error);
        return false;
      }
      successToast(apiResponse?.data?.message ?? "Project was permanently deleted");
      queryClient.invalidateQueries({ queryKey: ["totalListedProjectsQuery"] });
      return true;
    },
  });
};

const useUpdateWalletAddressMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });
  const queryClient = useQueryClient();

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (data: WalletUpdatePayload | string) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      operationInProgress = true;

      const payload =
        typeof data === "string"
          ? { wallet_address: data }
          : {
            wallet_address: data.address,
            signature: data.signature,
            message: data.message,
          };

      const [response, error] = await tryCatch(
        apiClient.put("/profile/updateWalletAddress", payload)
      );

      if (response) {
        const isDisconnect = typeof data === "string";
        successToast(isDisconnect ? "Wallet disconnected successfully" : "Wallet connected successfully");
      }

      setTimeout(() => {
        operationInProgress = false;

        queryClient.invalidateQueries({
          queryKey: ["getWalletAddressQuery"],
        });
      }, 300);

      if (error) {
        handleError(error);
        throw error;
      }
    },
  });
};

const useRetryRepoZipUploadMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (github_repo_id: string) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      operationInProgress = true;

      const [response, error] = await tryCatch(
        apiClient.post("/projects/retryRepoZipUpload", { github_repo_id })
      );

      operationInProgress = false;

      if (error) {
        handleError(error);
        throw error;
      }
      successToast("Retry initiated");
      return response.data;
    },
  });
};

const useRefreshRepoZipMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  let operationInProgress = false;

  return useMutation({
    mutationFn: async (github_repo_id: string) => {
      if (operationInProgress) {
        throw new Error("Operation already in progress");
      }

      operationInProgress = true;

      const [response, error] = await tryCatch(
        apiClient.post("/projects/refreshRepoZip", { github_repo_id })
      );

      operationInProgress = false;

      if (error) {
        handleError(error);
        throw error;
      }
      successToast("Repackage initiated");
      return response.data;
    },
  });
};

const useToggleWishlistMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project_id: string) => {
      const [response, error] = await tryCatch(
        apiClient.post<{ data: { isWishlisted: boolean } }>("/wishlist/toggle", {
          project_id,
        })
      );

      if (error) {
        handleError(error);
        throw error;
      }

      return response.data.data;
    },
    onSuccess: (data) => {
      successToast(data.isWishlisted ? "Added to wishlist" : "Removed from wishlist");
      queryClient.invalidateQueries({ queryKey: ["wishlistQuery"] });
      queryClient.invalidateQueries({ queryKey: ["wishlistInfinite"] });
      queryClient.invalidateQueries({ queryKey: ["wishlistCount"] });
    },
  });
};

const useInitiatePurchaseMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  return useMutation({
    mutationFn: async (project_id: string) => {
      const [response, error] = await tryCatch(
        apiClient.post<{ data: PurchaseIntent }>("/purchases/initiate", { project_id })
      );

      if (error) {
        handleError(error);
        throw error;
      }

      return response.data.data;
    },
  });
};

const useConfirmPurchaseMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PurchaseConfirmPayload) => {
      const [response, error] = await tryCatch(
        apiClient.post<{ data: { projectId: string } }>("/purchases/confirm", payload)
      );

      if (error) {
        handleError(error);
        throw error;
      }

      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchasedProjectsQuery"] });
      queryClient.invalidateQueries({ queryKey: ["purchasedProjectsInfinite"] });
      queryClient.invalidateQueries({ queryKey: ["wishlistQuery"] });
      queryClient.invalidateQueries({ queryKey: ["wishlistInfinite"] });
      queryClient.invalidateQueries({ queryKey: ["wishlistCount"] });
    },
  });
};

const useDownloadProjectMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  return useMutation({
    mutationFn: async (project_id: string) => {
      const [response, error] = await tryCatch(
        apiClient.get<{ data: { download_url: string } }>(
          `/purchases/download?project_id=${project_id}`
        )
      );

      if (error) {
        handleError(error);
        throw error;
      }

      return response.data.data;
    },
    onSuccess: (data) => {
      const a = document.createElement("a");
      a.href = data.download_url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
  });
};

const useDownloadReceiptMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });

  return useMutation({
    mutationFn: async (purchase_id: string) => {
      const [response, error] = await tryCatch(
        apiClient.get(`/purchases/receipt?purchase_id=${purchase_id}`, {
          responseType: "blob",
        })
      );

      if (error) {
        handleError(error);
        throw error;
      }

      return response.data as Blob;
    },
    onSuccess: (blob, purchase_id) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `devsdistro-receipt-${purchase_id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
};

const useSubmitReviewMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SubmitReviewPayload) => {
      const [response, error] = await tryCatch(
        apiClient.post("/reviews/project", payload)
      );

      if (error) {
        handleError(error);
        throw error;
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectReviews", variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ["myProjectReview", variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ["projectDetail", variables.project_id] });
    },
  });
};

const useUpdateReviewMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SubmitReviewPayload) => {
      const [response, error] = await tryCatch(
        apiClient.put("/reviews/project", payload)
      );

      if (error) {
        handleError(error);
        throw error;
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectReviews", variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ["myProjectReview", variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ["projectDetail", variables.project_id] });
    },
  });
};

const useDeleteReviewMutation = ({ logout }: mutationParameter) => {
  const { handleError } = useHandleError({ logout });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project_id: string) => {
      const [response, error] = await tryCatch(
        apiClient.delete("/reviews/project", { data: { project_id } })
      );

      if (error) {
        handleError(error);
        throw error;
      }

      return response.data;
    },
    onSuccess: (_, project_id) => {
      queryClient.invalidateQueries({ queryKey: ["projectReviews", project_id] });
      queryClient.invalidateQueries({ queryKey: ["myProjectReview", project_id] });
      queryClient.invalidateQueries({ queryKey: ["projectDetail", project_id] });
    },
  });
};

const useDeleteAccountMutation = () => {
  const queryClient = useQueryClient();
  const resetUser = useResetRecoilState(user);
  const resetUserCurrency = useResetRecoilState(userCurrency);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      const [, error] = await tryCatch(apiClient.delete("/auth/deleteAccount"));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
      resetUser();
      resetUserCurrency();
      navigate("/");
    },
  });
};

export {
  useProfileUpdateMutation,
  usePreSignedUrlForProjectMediaUploadMutation,
  useValidateMediaUploadAndStoreProjectMutation,
  useToggleProjectListingMutation,
  useDeleteProjectListingMutation,
  useUpdateWalletAddressMutation,
  useRetryRepoZipUploadMutation,
  useRefreshRepoZipMutation,
  useToggleWishlistMutation,
  useInitiatePurchaseMutation,
  useConfirmPurchaseMutation,
  useDownloadProjectMutation,
  useDownloadReceiptMutation,
  useSubmitReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
  useDeleteAccountMutation,
};
