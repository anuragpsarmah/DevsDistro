import { Label } from "@/components/ui/label";
import { Plus, Upload, X, GripVertical } from "lucide-react";
import { MAX_IMAGES } from "../utils/constants";
import { ChangeEvent, memo, useEffect, useMemo, useRef, useState } from "react";
import { ImageItem, ProjectMediaUploaderProps } from "../utils/types";

const ProjectMediaUploader = memo(function ProjectMediaUploader({
  imageItems,
  setImageItems,
  video,
  setVideo,
  existingVideo,
  setExistingVideo,
}: ProjectMediaUploaderProps) {
  const videoUrlRef = useRef<string | null>(null);
  const nextIdRef = useRef<number>(0);
  const imageItemsRef = useRef(imageItems);
  imageItemsRef.current = imageItems;

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const videoPreviewUrl = useMemo(() => {
    if (video) {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = URL.createObjectURL(video);
      return videoUrlRef.current;
    }
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    return null;
  }, [video]);

  useEffect(() => {
    return () => {
      imageItemsRef.current.forEach((item) => {
        if (item.type === "new") URL.revokeObjectURL(item.objectUrl);
      });
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, []);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const available = MAX_IMAGES - imageItems.length;
    if (available <= 0) return;
    const toAdd: ImageItem[] = files.slice(0, available).map((file) => ({
      type: "new" as const,
      file,
      id: nextIdRef.current++,
      objectUrl: URL.createObjectURL(file),
    }));
    setImageItems((prev) => [...prev, ...toAdd]);
    e.target.value = "";
  };

  const handleVideoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideo(e.target.files[0]);
      if (existingVideo && setExistingVideo) {
        setExistingVideo(null);
      }
    }
  };

  const removeImage = (index: number) => {
    const item = imageItems[index];
    if (item.type === "new") URL.revokeObjectURL(item.objectUrl);
    setImageItems((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewVideo = () => {
    setVideo(null);
  };

  const removeExistingVideo = () => {
    if (setExistingVideo) setExistingVideo(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setImageItems((prev) => {
      const next = [...prev];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, removed);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const getImageSrc = (item: ImageItem): string => {
    if (item.type === "existing") return item.url;
    return item.objectUrl;
  };

  return (
    <>
      <div>
        <Label className="font-space text-[10px] uppercase font-bold tracking-[0.2em] text-gray-600 dark:text-gray-400 mt-10 mb-3 block flex items-center">
          Project Images
          <span className="text-[10px] text-gray-400 ml-2 tracking-widest">
            (UP TO {MAX_IMAGES} IMAGES)
          </span>
        </Label>
        <p className="font-space text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">
          Add screenshots or mockups showcasing key features
        </p>
        {imageItems.length > 0 && (
          <p className="font-space text-[10px] text-gray-400 mb-4 uppercase tracking-wider">
            Drag to reorder — first image is the cover shown on cards
          </p>
        )}
        <div className="flex flex-wrap gap-4 mt-2">
          {imageItems.map((item, index) => {
            const isDragging = dragIndex === index;
            const isDropTarget = dragOverIndex === index && dragIndex !== index;
            return (
              <div
                key={
                  item.type === "existing"
                    ? `existing-${item.url}`
                    : `new-${item.id}`
                }
                className={`relative group cursor-grab active:cursor-grabbing transition-all duration-150 ${
                  isDragging ? "opacity-40 scale-95" : "opacity-100"
                } ${isDropTarget ? "ring-2 ring-red-500 ring-offset-1" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <img
                  src={getImageSrc(item)}
                  alt={`Project image ${index + 1}`}
                  className="w-24 h-24 object-cover border-2 border-black/20 dark:border-white/20 transition-colors duration-300 pointer-events-none select-none"
                  draggable={false}
                />
                {index === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-red-500 text-white font-space font-bold uppercase text-[8px] tracking-widest text-center py-0.5 pointer-events-none">
                    COVER
                  </span>
                )}
                <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-70 transition-opacity pointer-events-none">
                  <GripVertical className="w-3 h-3 text-white drop-shadow" />
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            );
          })}

          {imageItems.length < MAX_IMAGES && (
            <label className="w-24 h-24 flex items-center justify-center bg-transparent border-2 border-dashed border-black/20 dark:border-white/20 cursor-pointer hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="sr-only"
                multiple
              />
              <Plus className="w-6 h-6 text-black dark:text-white" />
            </label>
          )}
        </div>
      </div>

      <div className="mt-10">
        <Label className="font-space text-[10px] uppercase font-bold tracking-[0.2em] text-gray-600 dark:text-gray-400 mb-3 block flex items-center">
          Project Demo Video
          <span className="text-[10px] text-gray-400 ml-2 tracking-widest">
            (OPTIONAL)
          </span>
        </Label>
        <p className="font-space text-xs text-gray-500 mb-4 uppercase tracking-wider font-bold">
          Add a short demo video showcasing your project in action
        </p>
        {existingVideo ? (
          <div className="relative mt-2 border-2 border-black/20 dark:border-white/20 p-2 group bg-black/5 dark:bg-white/5 transition-colors duration-300">
            <video src={existingVideo} className="w-full" controls />
            <button
              type="button"
              onClick={removeExistingVideo}
              className="absolute -top-2 -right-2 bg-red-500 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              aria-label="Remove existing video"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : videoPreviewUrl ? (
          <div className="relative mt-2 border-2 border-black/20 dark:border-white/20 p-2 group bg-black/5 dark:bg-white/5 transition-colors duration-300">
            <video src={videoPreviewUrl} className="w-full" controls />
            <button
              type="button"
              onClick={removeNewVideo}
              className="absolute -top-2 -right-2 bg-red-500 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              aria-label="Remove new video"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center w-full h-40 mt-2 border-2 border-dashed border-black/20 dark:border-white/20 cursor-pointer hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300">
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="sr-only"
            />
            <div className="flex flex-col items-center">
              <Upload className="w-8 h-8 text-black dark:text-white mb-2 transition-colors duration-300" />
              <span className="font-space text-xs text-black dark:text-white uppercase font-bold tracking-widest transition-colors duration-300">
                UPLOAD DEMO VIDEO (MAX 50MB)
              </span>
            </div>
          </label>
        )}
      </div>
    </>
  );
});

export default ProjectMediaUploader;
