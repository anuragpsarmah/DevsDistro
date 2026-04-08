import { useState } from "react";
import axios from "axios";
import { errorToast, successToast } from "@/components/ui/customToast";
import {
  ImageCropResult,
  ProjectMediaMetadata,
  UseProjectSubmissionProps,
  ProjectSubmitFormData,
} from "../utils/types";
import { tryCatch } from "@/utils/tryCatch.util";

export const useProjectSubmission = ({
  handleGetPreSignedUrls,
  handleValidateUploadAndStoreProject,
  modificationType,
  setActiveTab,
  handleReturnToAllListings,
  onRepoAccessError,
  github_repo_id,
  installation_id,
}: UseProjectSubmissionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async (
    formData: ProjectSubmitFormData,
    croppedItems: ImageCropResult[]
  ) => {
    setIsSubmitting(true);
    setUploadProgress(0);

    const cardBlobsToUpload: Blob[] = [];
    const detailBlobsToUpload: Blob[] = [];

    croppedItems.forEach((result) => {
      if (result.type === "new") {
        cardBlobsToUpload.push(result.cardBlob);
        detailBlobsToUpload.push(result.detailBlob);
      } else if (result.type === "existing_recrop") {
        detailBlobsToUpload.push(result.detailBlob);
      } else if (result.type === "existing_card_recrop") {
        cardBlobsToUpload.push(result.cardBlob);
      }
    });

    const cardMetadata: ProjectMediaMetadata[] = cardBlobsToUpload.map(
      (blob) => ({
        originalName: "image.jpg",
        fileType: "image/jpeg",
        fileSize: blob.size,
      })
    );

    const videoMetadata: ProjectMediaMetadata[] = formData.video
      ? [
          {
            originalName: formData.video.name,
            fileType: formData.video.type,
            fileSize: formData.video.size,
          },
        ]
      : [];

    const detailMetadata: ProjectMediaMetadata[] = detailBlobsToUpload.map(
      (blob) => ({
        originalName: "detail.jpg",
        fileType: "image/jpeg",
        fileSize: blob.size,
      })
    );

    const existingImageCount = croppedItems.filter(
      (r) => r.type !== "new" && r.type !== "existing_card_recrop"
    ).length;
    const metadata = [...cardMetadata, ...videoMetadata];

    const [urlResponse, urlFetchError] = await tryCatch(
      handleGetPreSignedUrls(
        metadata,
        existingImageCount,
        formData?.existingVideo ? 1 : 0,
        modificationType,
        detailMetadata.length > 0 ? detailMetadata : undefined
      ) as Promise<{ data: { uploadSignedUrl: string; key: string }[] }>
    );

    if (urlFetchError || !urlResponse) {
      setIsSubmitting(false);
      setUploadProgress(0);
      return;
    }

    const cardAndVideoUrlCount = metadata.length;
    const allUrls = urlResponse.data;

    const allFilesToUpload: (Blob | File)[] = [
      ...cardBlobsToUpload,
      ...(formData.video ? [formData.video] : []),
      ...detailBlobsToUpload,
    ];

    const allContentTypes: string[] = [
      ...cardBlobsToUpload.map(() => "image/jpeg"),
      ...(formData.video ? [formData.video.type] : []),
      ...detailBlobsToUpload.map(() => "image/jpeg"),
    ];

    const totalFiles = allFilesToUpload.length;
    let completedFiles = 0;

    const [keys, uploadError] = await tryCatch<string[]>(() =>
      Promise.all(
        allUrls.map(async (urlData, index) => {
          await axios.put(urlData.uploadSignedUrl, allFilesToUpload[index], {
            headers: { "Content-Type": allContentTypes[index] },
          });
          completedFiles++;
          setUploadProgress((completedFiles / totalFiles) * 100);
          return urlData.key;
        })
      )
    );

    if (uploadError || !keys) {
      errorToast("File upload failed. Try again.");
      setIsSubmitting(false);
      setUploadProgress(0);
      return;
    }

    const cardKeys = keys.slice(0, cardBlobsToUpload.length);
    const videoKey = formData.video
      ? keys[cardBlobsToUpload.length]
      : undefined;
    const detailKeys = keys.slice(cardAndVideoUrlCount);

    let cardKeyIdx = 0;
    let detailKeyIdx = 0;
    const imageOrder: string[] = [];
    const imageOrder_detail: string[] = [];

    croppedItems.forEach((result) => {
      if (result.type === "existing_complete") {
        imageOrder.push(result.cardUrl);
        imageOrder_detail.push(result.detailUrl);
      } else if (result.type === "existing_recrop") {
        imageOrder.push(result.cardUrl);
        imageOrder_detail.push(detailKeys[detailKeyIdx++]);
      } else if (result.type === "existing_card_recrop") {
        imageOrder.push(cardKeys[cardKeyIdx++]);
        imageOrder_detail.push(result.detailUrl);
      } else {
        imageOrder.push(cardKeys[cardKeyIdx++]);
        imageOrder_detail.push(detailKeys[detailKeyIdx++]);
      }
    });

    const validatedProjectData = {
      github_repo_id: github_repo_id || "",
      installation_id,
      title: formData.title,
      description: formData.description,
      project_type: formData.projectType,
      tech_stack: formData.techStack,
      live_link: formData.liveLink,
      price: formData.price,
      allow_payments_in_sol: formData.allowPaymentsInSol,
      imageOrder,
      imageOrder_detail,
      project_video: formData.video && videoKey ? videoKey : "",
      existingVideo: formData?.existingVideo || "",
    };

    const [finalResponse, storeError] = await tryCatch(
      handleValidateUploadAndStoreProject(
        validatedProjectData,
        modificationType
      ) as Promise<{ message: string }>
    );

    if (storeError) {
      if (
        axios.isAxiosError(storeError) &&
        (storeError.response?.status === 404 ||
          storeError.response?.status === 403)
      ) {
        if (onRepoAccessError) onRepoAccessError();
      }
      setIsSubmitting(false);
      setUploadProgress(0);
      return;
    }

    if (finalResponse) {
      successToast(
        finalResponse?.message || "Project listed/modified successfully"
      );
      if (setActiveTab) setActiveTab("My Projects");
      if (handleReturnToAllListings) handleReturnToAllListings();
    }

    setIsSubmitting(false);
    setUploadProgress(0);
  };

  return { handleSubmit, isSubmitting, uploadProgress };
};
