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
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TECH_STACK,
  PROJECT_TYPES,
} from "../utils/constants";
import { ProjectGeneralInfoProps, ProjectType } from "../utils/types";

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

  const atTechLimit = techStack.length >= MAX_TECH_STACK;

  const handleTechInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && techInput.trim()) {
      e.preventDefault();
      if (atTechLimit) return;
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
    <div className="space-y-10">
      <div>
        <Label
          htmlFor="title"
          className="font-space text-[10px] uppercase font-bold tracking-[0.2em] text-gray-600 dark:text-gray-400 mb-3 block"
        >
          Project Title<span className="text-red-500 ml-1">*</span>
        </Label>
        <Input
          id="title"
          ref={title}
          defaultValue={defaultTitle || ""}
          className="bg-transparent border-2 border-neutral-800/20 dark:border-white/20 text-neutral-800 dark:text-white rounded-none font-space py-6 focus:ring-0 focus:border-red-500 transition-colors duration-300"
          placeholder="e.g., E-commerce Dashboard, AI Content Generator"
          required
        />
      </div>

      <div>
        <Label
          htmlFor="description"
          className="font-space text-[10px] uppercase font-bold tracking-[0.2em] text-gray-600 dark:text-gray-400 mb-3 block"
        >
          Project Description<span className="text-red-500 ml-1">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Provide a clear overview of your project. Include key features, technologies used, and what problems it solves. Be specific about your role and contributions."
          value={description}
          onChange={handleDescriptionChange}
          className="bg-transparent text-neutral-800 dark:text-white border-2 border-neutral-800/20 dark:border-white/20 rounded-none font-space focus:ring-0 focus:border-red-500 transition-colors duration-300 h-40 resize-none p-4"
        />
        <div className="flex justify-end mt-2">
          <p
            className={`font-space text-xs font-bold tracking-widest uppercase ${MAX_DESCRIPTION_LENGTH - description.length <= 50 ? "text-red-500" : "text-gray-500"}`}
          >
            {description.length} / {MAX_DESCRIPTION_LENGTH}
          </p>
        </div>
      </div>

      <div>
        <Label
          htmlFor="projectType"
          className="font-space text-[10px] uppercase font-bold tracking-[0.2em] text-gray-600 dark:text-gray-400 mb-3 block"
        >
          Project Type<span className="text-red-500 ml-1">*</span>
        </Label>
        <Select
          value={projectType}
          onValueChange={(value: ProjectType) => setProjectType(value)}
        >
          <SelectTrigger className="bg-transparent border-2 border-neutral-800/20 dark:border-white/20 text-neutral-800 dark:text-white rounded-none font-space py-6 focus:ring-0 focus:border-red-500 transition-colors duration-300">
            <SelectValue placeholder="Choose the category that best fits your project" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#050505] border-2 border-neutral-800 dark:border-white text-neutral-800 dark:text-white rounded-none font-space transition-colors duration-300">
            {PROJECT_TYPES.map((type) => (
              <SelectItem
                key={type}
                value={type}
                className="focus:bg-neutral-800/5 dark:focus:bg-white/5 cursor-pointer text-neutral-800 dark:text-white uppercase text-xs font-bold tracking-widest rounded-none"
              >
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label
            htmlFor="techStack"
            className="font-space text-[10px] uppercase font-bold tracking-[0.2em] text-gray-600 dark:text-gray-400"
          >
            Tech Stack<span className="text-red-500 ml-1">*</span>
          </Label>
          <p
            className={`font-space text-xs font-bold tracking-widest uppercase ${atTechLimit ? "text-red-500" : "text-gray-500"}`}
          >
            {techStack.length} / {MAX_TECH_STACK}
          </p>
        </div>
        <Input
          id="techStack"
          value={techInput}
          onChange={handleTechInputChange}
          onKeyDown={handleTechInputKeyDown}
          disabled={atTechLimit}
          className="bg-transparent border-2 border-neutral-800/20 dark:border-white/20 text-neutral-800 dark:text-white rounded-none font-space py-6 focus:ring-0 focus:border-red-500 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={
            atTechLimit
              ? "Limit reached (15/15)"
              : "e.g., React, Node.js, MongoDB (Press Enter to add)"
          }
        />
        <p className="font-space text-xs text-gray-500 mt-2 uppercase tracking-wider font-bold">
          Add all major technologies and frameworks used
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          {techStack.map((tech, index) => (
            <div
              key={index}
              className="flex items-center bg-transparent border-2 border-neutral-800 dark:border-white text-neutral-800 dark:text-white px-4 py-2 font-space text-xs uppercase font-bold tracking-widest rounded-none transition-colors duration-300"
            >
              <span>{tech}</span>
              <button
                type="button"
                onClick={() => removeTech(tech)}
                className="ml-3 text-red-500 hover:text-red-700 transition-colors duration-200"
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
          className="font-space text-[10px] uppercase font-bold tracking-[0.2em] text-gray-600 dark:text-gray-400 mb-3 block flex items-center"
        >
          Live Link
          <span className="text-[10px] text-gray-400 ml-2 tracking-widest">
            (OPTIONAL)
          </span>
        </Label>
        <Input
          id="liveLink"
          type="url"
          value={liveLink}
          onChange={(e) => setLiveLink(e.target.value)}
          className="bg-transparent border-2 border-neutral-800/20 dark:border-white/20 text-neutral-800 dark:text-white rounded-none font-space py-6 focus:ring-0 focus:border-red-500 transition-colors duration-300"
          placeholder="https://project-demo.com or https://username.github.io/project"
        />
        <p className="font-space text-xs text-gray-500 mt-2 uppercase tracking-wider font-bold">
          Add a link to your live project
        </p>
      </div>
    </div>
  );
}
