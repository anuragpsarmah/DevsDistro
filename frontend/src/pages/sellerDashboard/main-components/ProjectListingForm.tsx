import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Import } from "lucide-react";
import {
  ImageItem,
  ImageCropResult,
  ProjectListingFormProps,
  ProjectType,
} from "../utils/types";
import { useProjectSubmission } from "../hooks/useProjectSubmission";
import { projectListingFormDataValidation } from "../utils/projectListingFormValidation";
import { errorToast } from "@/components/ui/customToast";
import UploadOverlay from "../sub-components/UploadOverlay";
import ProjectGeneralInfo from "../sub-components/ProjectGeneralInfo";
import ProjectMediaUploader from "../sub-components/ProjectMediaUploader";
import ProjectPriceSelection from "../sub-components/ProjectPriceSelection";
import ImageCropOverlay from "../sub-components/ImageCropOverlay";

export default function ProjectListingForm({
  formProps,
  setFormPropsAndSwitchUI,
  handleGetPreSignedUrls,
  handleValidateUploadAndStoreProject,
  setActiveTab,
}: ProjectListingFormProps) {
  const title = useRef<HTMLInputElement | null>(null);
  const [description, setDescription] = useState(formProps.description || "");
  const [projectType, setProjectType] =
    useState<ProjectType>("Web Application");
  const [techStack, setTechStack] = useState<string[]>([formProps.language]);
  const [techInput, setTechInput] = useState("");
  const [liveLink, setLiveLink] = useState("");
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [price, setPrice] = useState<number>(9.99);

  const [showCropOverlay, setShowCropOverlay] = useState(false);

  const handleDifferentProjectImport = () => {
    setFormPropsAndSwitchUI({
      name: "",
      description: "",
      language: "",
      updated_at: "",
      github_repo_id: "",
      installation_id: undefined,
    });
  };

  const { handleSubmit, isSubmitting, uploadProgress } = useProjectSubmission({
    handleGetPreSignedUrls,
    handleValidateUploadAndStoreProject,
    modificationType: "new",
    setActiveTab,
    onRepoAccessError: handleDifferentProjectImport,
    github_repo_id: formProps.github_repo_id,
    installation_id: formProps.installation_id,
  });

  const onSubmitClick = () => {
    const formData = {
      title: title.current?.value || "",
      description,
      projectType,
      techStack,
      liveLink,
      imageItems,
      video,
      price,
    };

    const validationError = projectListingFormDataValidation(formData);
    if (validationError) {
      errorToast(validationError);
      return;
    }

    setShowCropOverlay(true);
  };

  const onCropComplete = (croppedItems: ImageCropResult[]) => {
    setShowCropOverlay(false);
    handleSubmit(
      {
        title: title.current?.value || "",
        description,
        projectType,
        techStack,
        liveLink,
        video,
        price,
      },
      croppedItems
    );
  };

  return (
    <div>
      {isSubmitting && <UploadOverlay uploadProgress={uploadProgress} />}

      {showCropOverlay && (
        <ImageCropOverlay
          imageItems={imageItems}
          detailUrlMap={new Map()}
          onComplete={onCropComplete}
          onCancel={() => setShowCropOverlay(false)}
        />
      )}

      <div className="space-y-6">
        <div className="rounded-xl">
          <div className="space-y-6">
            <div className="flex justify-end mb-8">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                className="flex items-center gap-3 px-6 py-4 bg-transparent border-2 border-black dark:border-white text-black dark:text-white font-space font-bold uppercase tracking-widest text-[10px] md:text-sm rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDifferentProjectImport}
              >
                <Import className="w-4 h-4" />
                Import Different Project
              </Button>
            </div>

            <ProjectGeneralInfo
              setDescription={setDescription}
              setTechInput={setTechInput}
              setTechStack={setTechStack}
              setProjectType={setProjectType}
              setLiveLink={setLiveLink}
              defaultTitle={formProps.name}
              description={description}
              techInput={techInput}
              techStack={techStack}
              projectType={projectType}
              liveLink={liveLink}
              title={title}
            />

            <ProjectMediaUploader
              imageItems={imageItems}
              setImageItems={setImageItems}
              video={video}
              setVideo={setVideo}
            />

            <ProjectPriceSelection price={price} setPrice={setPrice} />

            <Button
              type="button"
              disabled={isSubmitting}
              className="w-full px-8 py-4 bg-black text-white dark:bg-white dark:text-black font-space font-bold uppercase tracking-widest text-[10px] md:text-sm rounded-none border-2 border-transparent hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white hover:border-black dark:hover:border-white transition-colors duration-300 mt-12 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onSubmitClick}
            >
              Submit Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
