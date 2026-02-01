import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Import } from "lucide-react";
import { ProjectListingFormProps, ProjectType } from "../utils/types";
import { useProjectSubmission } from "../hooks/useProjectSubmission";
import UploadOverlay from "../sub-components/UploadOverlay";
import ProjectGeneralInfo from "../sub-components/ProjectGeneralInfo";
import ProjectMediaUploader from "../sub-components/ProjectMediaUploader";
import ProjectPriceSelection from "../sub-components/ProjectPriceSelection";

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
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [price, setPrice] = useState<number>(0.1);

  const { handleSubmit, isSubmitting, uploadProgress } = useProjectSubmission({
    handleGetPreSignedUrls,
    handleValidateUploadAndStoreProject,
    modificationType: "new",
    setActiveTab,
    github_repo_id: formProps.github_repo_id,
  });

  const handleDifferentProjectImport = () => {
    setFormPropsAndSwitchUI({
      name: "",
      description: "",
      language: "",
      updated_at: "",
      github_repo_id: "",
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

      <div className="space-y-6">
        <div className="rounded-xl">
          <div className="space-y-6">
            <div className="flex lg:justify-end md:justify-end justify-center mb-4">
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200"
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
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg shadow-purple-500/20 transition-all duration-300"
              onClick={onSubmit}
            >
              Submit Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
