import { Label } from "@/components/ui/label";
import { Plus, Upload, X } from "lucide-react";
import { MAX_IMAGES } from "../utils/constants";
import { ChangeEvent, useMemo, memo, useEffect, useRef } from "react";
import { ProjectMediaUploaderProps } from "../utils/types";

const ProjectMediaUploader = memo(function ProjectMediaUploader({
  images,
  setImages,
  video,
  setVideo,
  existingImages,
  setExistingImages,
  existingVideo,
  setExistingVideo,
}: ProjectMediaUploaderProps) {
  const imageUrlsRef = useRef<{ [key: string]: string }>({});
  const videoUrlRef = useRef<string | null>(null);

  const newImageUrls = useMemo(() => {
    const newUrls: string[] = [];

    images.forEach((image, index) => {
      if (!imageUrlsRef.current[image.name + index]) {
        imageUrlsRef.current[image.name + index] = URL.createObjectURL(image);
      }
      newUrls.push(imageUrlsRef.current[image.name + index]);
    });

    Object.entries(imageUrlsRef.current).forEach(([key, url]) => {
      if (!images.some((img, idx) => key === img.name + idx)) {
        URL.revokeObjectURL(url);
        delete imageUrlsRef.current[key];
      }
    });

    return newUrls;
  }, [images]);

  const newVideoUrl = useMemo(() => {
    if (video) {
      const newUrl = URL.createObjectURL(video);
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
      videoUrlRef.current = newUrl;
      return videoUrlRef.current;
    }
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    return null;
  }, [video]);

  useEffect(() => {
    const imageUrls = { ...imageUrlsRef.current };
    const videoUrl = videoUrlRef.current;

    return () => {
      Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url));
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, []);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const existingCount = existingImages?.length || 0;
    const totalImages = existingCount + images.length + files.length;

    if (totalImages <= MAX_IMAGES) {
      setImages((prevImages: File[]) => [...prevImages, ...(files as File[])]);
    }
  };

  const handleVideoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideo(e.target.files[0]);
      if (existingVideo && setExistingVideo) {
        setExistingVideo(null);
      }
    }
  };

  const removeNewImage = (index: number) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    if (setExistingImages && existingImages) {
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const removeNewVideo = () => {
    setVideo(null);
  };

  const removeExistingVideo = () => {
    if (setExistingVideo) {
      setExistingVideo(null);
    }
  };

  const totalImagesCount = (existingImages?.length || 0) + images.length;

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
          {/* Only render existing images if they exist */}
          {existingImages?.map((url, index) => (
            <div key={`existing-${url}`} className="relative">
              <img
                src={url}
                alt={`Existing project image ${index + 1}`}
                className="w-20 h-20 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => removeExistingImage(index)}
                className="absolute -bottom-2 -right-2 bg-red-500 rounded-full p-1"
                aria-label={`Remove existing image ${index + 1}`}
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}

          {newImageUrls.map((url, index) => (
            <div key={images[index].name + index} className="relative">
              <img
                src={url}
                alt={`New project image ${index + 1}`}
                className="w-20 h-20 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => removeNewImage(index)}
                className="absolute -bottom-2 -right-2 bg-red-500 rounded-full p-1"
                aria-label={`Remove new image ${index + 1}`}
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}

          {totalImagesCount < MAX_IMAGES && (
            <label className="w-20 h-20 flex items-center justify-center bg-white/5 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all duration-200">
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
        {existingVideo ? (
          <div className="relative mt-2">
            <video src={existingVideo} className="w-full rounded-md" controls />
            <button
              type="button"
              onClick={removeExistingVideo}
              className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
              aria-label="Remove existing video"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : newVideoUrl ? (
          <div className="relative mt-2">
            <video src={newVideoUrl} className="w-full rounded-md" controls />
            <button
              type="button"
              onClick={removeNewVideo}
              className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
              aria-label="Remove new video"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center w-full h-32 mt-2 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all duration-200">
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
});

export default ProjectMediaUploader;
