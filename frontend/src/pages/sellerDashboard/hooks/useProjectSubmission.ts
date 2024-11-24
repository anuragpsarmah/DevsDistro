import { useState } from "react";
import axios from "axios";
import { projectListingFormDataValidation } from "../utils/projectListingFormValidation";
import { errorToast, successToast } from "@/components/ui/customToast";
import { UseProjectSubmissionProps } from "@/utils/types";
import { projectListingFormData } from "../utils/types";

export const useProjectSubmission = ({
  handleGetPreSignedUrls,
  handleValidateUploadAndStoreProject,
  setActiveTab,
}: UseProjectSubmissionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async (formData: projectListingFormData) => {
    setIsSubmitting(true);
    setUploadProgress(0);

    const validationResult = projectListingFormDataValidation(formData);

    if (validationResult) {
      errorToast(validationResult);
      setIsSubmitting(false);
      return;
    }

    const metadata = [
      ...formData.images.map((file) => ({
        originalName: file.name,
        fileType: file.type,
        fileSize: file.size,
      })),
      ...(formData.video
        ? [
            {
              originalName: formData.video.name,
              fileType: formData.video.type,
              fileSize: formData.video.size,
            },
          ]
        : []),
    ];

    const urlResponse = (await handleGetPreSignedUrls(metadata)) as {
      data: { uploadSignedUrl: string; key: string }[];
    };
    if (!urlResponse) {
      setIsSubmitting(false);
      return;
    }

    try {
      const allFiles = [
        ...formData.images,
        ...(formData.video ? [formData.video] : []),
      ];
      const totalFiles = allFiles.length;

      const keys = await Promise.all(
        urlResponse.data.map(async (urlData, index) => {
          const file = allFiles[index];

          await axios.put(urlData.uploadSignedUrl, file, {
            headers: {
              "Content-Type": file.type,
            },
          });

          setUploadProgress(((index + 1) / totalFiles) * 100);

          return urlData.key;
        })
      );

      const validatedProjectData = {
        title: formData.title,
        description: formData.description,
        project_type: formData.projectType,
        tech_stack: formData.techStack,
        live_link: formData.liveLink,
        price: formData.price,
        project_images: [] as string[],
        project_video: "",
      };

      if (!formData.video) {
        validatedProjectData.project_images = [...keys];
      } else {
        validatedProjectData.project_images = keys.slice(
          0,
          formData.images.length
        );
        validatedProjectData.project_video = keys[formData.images.length];
      }

      const finalResponse = (await handleValidateUploadAndStoreProject(
        validatedProjectData
      )) as { message: string };

      if (finalResponse) {
        successToast(finalResponse?.message);
      }
      setActiveTab("Manage Projects");
    } catch (error) {
      console.error("Upload failed:", error);
      errorToast("Failed to upload files. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return {
    handleSubmit,
    isSubmitting,
    uploadProgress,
  };
};
