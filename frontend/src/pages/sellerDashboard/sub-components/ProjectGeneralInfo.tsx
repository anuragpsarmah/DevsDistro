import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { ChangeEvent, KeyboardEvent } from "react";
import { MAX_DESCRIPTION_LENGTH, PROJECT_TYPES } from "../utils/constants";
import { ProjectType } from "../utils/types";

interface ProjectGeneralInfoProps {
  setDescription: (curr: string) => void;
  setTechInput: (curr: string) => void;
  setTechStack: (curr: string[]) => void;
  setProjectType: (curr: ProjectType) => void;
  setLiveLink: (curr: string) => void;
  defaultTitle: string;
  description: string;
  techInput: string;
  techStack: string[];
  projectType: ProjectType;
  liveLink: string;
  title: React.MutableRefObject<HTMLInputElement | null>;
}

export default function ProjectGeneralInfo({
  setDescription,
  setTechInput,
  setTechStack,
  setProjectType,
  setLiveLink,
  defaultTitle,
  description,
  techInput,
  techStack,
  projectType,
  liveLink,
  title,
}: ProjectGeneralInfoProps) {
  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(e.target.value);
    }
  };

  const handleTechInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTechInput(e.target.value);
  };

  const handleTechInputKeyDown = (e: KeyboardEvent) => {
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

  return (
    <>
      <div>
        <Label htmlFor="title" className="text-gray-300 mb-2 block">
          Project Title<span className="text-red-400 ml-1">*</span>
        </Label>
        <Input
          id="title"
          ref={title}
          defaultValue={defaultTitle || ""}
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
          Add a link to your live project
        </p>
      </div>
    </>
  );
}
