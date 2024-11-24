import { Label } from "@/components/ui/label";
import { Plus, Upload, X } from "lucide-react";
import { MAX_IMAGES } from "../utils/constants";
import { ChangeEvent } from "react";
import { ProjectMediaUploaderProps } from "../utils/types";

export default function ProjectMediaUploader({
  images,
  setImages,
  video,
  setVideo,
}: ProjectMediaUploaderProps) {
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length <= MAX_IMAGES) {
      setImages((prevImages: File[]) => [...prevImages, ...(files as File[])]);
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

  return (
    <>
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
    </>
  );
}
