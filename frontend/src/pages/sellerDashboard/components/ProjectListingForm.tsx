import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Import } from "lucide-react";
import { ProjectListingFormProps, ProjectType } from "../utils/types";
import UploadOverlay from "./UploadOverlay";
import ProjectMediaUploader from "./ProjectMediaUploader";
import ProjectGeneralInfo from "./ProjectGeneralInfo";
import ProjectPriceSelection from "./ProjectPriceSelection";
import { useProjectSubmission } from "../hooks/useProjectSubmission";

export default function ProjectListingForm({
  formProps,
  setFormProps,
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
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [price, setPrice] = useState(299);

  const { handleSubmit, isSubmitting, uploadProgress } = useProjectSubmission({
    handleGetPreSignedUrls,
    handleValidateUploadAndStoreProject,
    setActiveTab,
  });

  const handleDifferentProjectImport = () => {
    setFormProps({
      name: "",
      description: "",
      language: "",
      updated_at: "",
    });
  };

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
            images={images}
            setImages={setImages}
            video={video}
            setVideo={setVideo}
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
