import { useState, ChangeEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, X, Plus, Import } from "lucide-react";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_IMAGES,
  PROJECT_TYPES,
} from "../utils/constants";
import { PrivateRepoData, ProjectType } from "../utils/types";

interface ProjectListingFormProps {
  formProps: PrivateRepoData;
  setFormProps: (curr: PrivateRepoData) => void;
  setIsImportState: (curr: boolean) => void;
}

export default function ProjectListingForm({
  formProps,
  setFormProps,
  setIsImportState,
}: ProjectListingFormProps) {
  const [title, setTitle] = useState(formProps.name);
  const [description, setDescription] = useState(formProps.description);
  const [projectType, setProjectType] =
    useState<ProjectType>("Web Application");
  const [techStack, setTechStack] = useState<string[]>([formProps.language]);
  const [techInput, setTechInput] = useState("");
  const [liveLink, setLiveLink] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);

  const handleDifferentProjectImport = () => {
    setIsImportState(true);
    setFormProps({
      name: "",
      description: "",
      language: "",
      updated_at: "",
    });
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(e.target.value);
    }
  };

  const handleTechInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTechInput(e.target.value);
  };

  const handleTechInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && techInput.trim()) {
      e.preventDefault();
      if (!techStack.includes(techInput.trim())) {
        setTechStack([...techStack, techInput.trim()]);
      }
      setTechInput("");
    }
  };

  const removeTech = (techToRemove: string) => {
    setTechStack(techStack.filter((tech) => tech !== techToRemove));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length <= MAX_IMAGES) {
      setImages((prevImages) => [...prevImages, ...files]);
    }
  };

  const handleVideoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideo(e.target.files[0]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideo(null);
  };

  const handleSubmit = () => {
    console.log({
      title,
      description,
      projectType,
      techStack,
      liveLink,
      images,
      video,
    });
  };

  return (
    <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex justify-end mb-4">
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
        <div>
          <Label htmlFor="title" className="text-gray-300 mb-2 block">
            Project Title<span className="text-red-400 ml-1">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-gray-700 border-gray-600 text-gray-300 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors"
            placeholder="e.g., E-commerce Dashboard, AI Content Generator"
            required
          />
        </div>

        <div>
          <Label htmlFor="description" className="text-gray-300 mb-2 block">
            Project Description<span className="text-red-400 ml-1">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Provide a clear overview of your project. Include key features, technologies used, and what problems it solves. Be specific about your role and contributions."
            value={description}
            onChange={handleDescriptionChange}
            className="bg-gray-700 text-gray-300 border-gray-600 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors h-32 resize-none"
          />
          <p
            className={`text-sm mt-1 ${MAX_DESCRIPTION_LENGTH - description.length <= 50 ? "text-red-400" : "text-gray-400"}`}
          >
            {description.length}/{MAX_DESCRIPTION_LENGTH} characters
          </p>
        </div>

        <div>
          <Label htmlFor="projectType" className="text-gray-300 mb-2 block">
            Project Type<span className="text-red-400 ml-1">*</span>
          </Label>
          <Select
            value={projectType}
            onValueChange={(value: ProjectType) => setProjectType(value)}
          >
            <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-300 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors">
              <SelectValue placeholder="Choose the category that best fits your project" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 text-gray-300 border-gray-600">
              {PROJECT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="techStack" className="text-gray-300 mb-2 block">
            Tech Stack<span className="text-red-400 ml-1">*</span>
          </Label>
          <Input
            id="techStack"
            value={techInput}
            onChange={handleTechInputChange}
            onKeyDown={handleTechInputKeyDown}
            className="bg-gray-700 border-gray-600 text-gray-300 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors"
            placeholder="e.g., React, Node.js, MongoDB (Press Enter to add)"
          />
          <p className="text-sm text-gray-400 mt-1">
            Add all major technologies and frameworks used in your project
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {techStack.map((tech, index) => (
              <div
                key={index}
                className="flex items-center bg-gray-700 text-gray-300 px-4 pt-1 pb-2 text-sm rounded-full"
              >
                <span>{tech}</span>
                <button
                  type="button"
                  onClick={() => removeTech(tech)}
                  className="ml-2 text-gray-400 hover:text-gray-200 pt-1"
                  aria-label={`Remove ${tech}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label
            htmlFor="liveLink"
            className="text-gray-300 mb-2 block flex items-center"
          >
            Live Link
            <span className="text-sm text-gray-400 ml-2">(Optional)</span>
          </Label>
          <Input
            id="liveLink"
            type="url"
            value={liveLink}
            onChange={(e) => setLiveLink(e.target.value)}
            className="bg-gray-700 border-gray-600 text-gray-300 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors"
            placeholder="https://project-demo.com or https://username.github.io/project"
          />
          <p className="text-sm text-gray-400 mt-1">
            Add a link to your live project or repository
          </p>
        </div>

        <div>
          <Label className="text-gray-300 mb-2 block flex items-center">
            Project Images
            <span className="text-sm text-gray-400 ml-2">
              (Up to {MAX_IMAGES} images)
            </span>
          </Label>
          <p className="text-sm text-gray-400 mb-2">
            Add screenshots or mockups showcasing key features
          </p>
          <div className="flex flex-wrap gap-4 mt-2">
            {images.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Project image ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -bottom-2 -right-2 bg-red-500 rounded-full p-1"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <label className="w-20 h-20 flex items-center justify-center bg-gray-700 border-2 border-dashed border-gray-600 rounded-md cursor-pointer hover:bg-gray-600 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="sr-only"
                  multiple
                />
                <Plus className="w-6 h-6 text-gray-400" />
              </label>
            )}
          </div>
        </div>

        <div>
          <Label className="text-gray-300 mb-2 block flex items-center">
            Project Demo Video
            <span className="text-sm text-gray-400 ml-2">(Optional)</span>
          </Label>
          <p className="text-sm text-gray-400 mb-2">
            Add a short demo video showcasing your project in action
          </p>
          {video ? (
            <div className="relative mt-2">
              <video
                src={URL.createObjectURL(video)}
                className="w-full rounded-md"
                controls
              />
              <button
                type="button"
                onClick={removeVideo}
                className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
                aria-label="Remove video"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center w-full h-32 mt-2 border-2 border-dashed border-gray-600 rounded-md cursor-pointer hover:bg-gray-700 transition-colors">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="sr-only"
              />
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="mt-2 text-sm text-gray-400">
                  Upload demo video (max 50MB)
                </span>
              </div>
            </label>
          )}
        </div>

        <Button
          type="button"
          className="w-full bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 text-white font-semibold py-2 px-6 rounded-md transition duration-300 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          onClick={handleSubmit}
        >
          Submit Project
        </Button>
      </div>
    </div>
  );
}
