import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { ProjectModificationFormProps, ProjectType } from "../utils/types";
import { useProjectSubmission } from "../hooks/useProjectSubmission";
import { useQueryClient } from "@tanstack/react-query";
import UploadOverlay from "../sub-components/UploadOverlay";
import ProjectGeneralInfo from "../sub-components/ProjectGeneralInfo";
import ProjectMediaUploader from "../sub-components/ProjectMediaUploader";
import ProjectPriceSelection from "../sub-components/ProjectPriceSelection";

export default function ProjectModificationForm({
  formProps,
  setFormProps,
  handleStateChange,
  handleGetPreSignedUrls,
  handleValidateUploadAndStoreProject,
  setActiveTab,
}: ProjectModificationFormProps) {
  const title = useRef<HTMLInputElement | null>(null);
  const [description, setDescription] = useState(formProps.description || "");
  const [projectType, setProjectType] =
    useState<ProjectType>("Web Application");
  const [techStack, setTechStack] = useState<string[]>(formProps.tech_stack);
  const [techInput, setTechInput] = useState("");
  const [liveLink, setLiveLink] = useState(formProps.live_link || "");
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [price, setPrice] = useState(formProps.price || 299);
  const [existingImages, setExistingImages] = useState<string[]>(
    formProps.project_images
  );
  const [existingVideo, setExistingVideo] = useState<string | null>(
    formProps.project_video || null
  );

  const queryClient = useQueryClient();

  const handleReturnToAllListings = () => {
    queryClient.invalidateQueries({ queryKey: ["initialProjectDataQuery"] });

    setFormProps({
      isActive: false,
      title: "",
      description: "",
      tech_stack: [],
      live_link: "",
      price: 0,
      project_images: [],
      project_type: "",
      project_video: "",
    });

    handleStateChange("projects");
  };

  const { handleSubmit, isSubmitting, uploadProgress } = useProjectSubmission({
    handleGetPreSignedUrls,
    handleValidateUploadAndStoreProject,
    modificationType: "existing",
    setActiveTab,
    handleReturnToAllListings,
  });

  const onSubmit = () => {
    handleSubmit({
      title: title.current?.value || "",
      description,
      projectType,
      techStack,
      liveLink,
      images,
      video,
      price,
      existingImages,
      existingVideo,
    });
  };

  return (
    <div>
      {isSubmitting && <UploadOverlay uploadProgress={uploadProgress} />}

      <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex lg:justify-end md:justify-end justify-center mb-4">
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2 bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white"
              onClick={handleReturnToAllListings}
            >
              <Undo2 className="w-4 h-4" />
              Undo Changes
            </Button>
          </div>

          <ProjectGeneralInfo
            setDescription={setDescription}
            setTechInput={setTechInput}
            setTechStack={setTechStack}
            setProjectType={setProjectType}
            setLiveLink={setLiveLink}
            defaultTitle={formProps.title}
            description={description}
            techInput={techInput}
            techStack={techStack}
            projectType={projectType}
            liveLink={liveLink}
            title={title}
          />

          <ProjectMediaUploader
            images={images}
            setImages={setImages}
            video={video}
            setVideo={setVideo}
            existingImages={existingImages}
            setExistingImages={setExistingImages}
            existingVideo={existingVideo}
            setExistingVideo={setExistingVideo}
          />

          <ProjectPriceSelection price={price} setPrice={setPrice} />

          <Button
            type="button"
            className="w-full bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 text-white font-semibold py-2 px-6 rounded-md transition duration-300 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
            onClick={onSubmit}
          >
            Submit Project
          </Button>
        </div>
      </div>
    </div>
  );
}
