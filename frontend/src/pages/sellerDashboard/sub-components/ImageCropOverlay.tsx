import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { ImageItem, ImageCropResult } from "../utils/types";
import {
  getCroppedImageBlob,
  getDefaultCrop,
} from "@/pages/sellerDashboard/utils/cropImage";
import {
  CARD_ASPECT_RATIO,
  CARD_CROP_WIDTH,
  CARD_CROP_HEIGHT,
  DETAIL_ASPECT_RATIO,
  DETAIL_CROP_WIDTH,
  DETAIL_CROP_HEIGHT,
} from "@/pages/sellerDashboard/utils/constants";
import { errorToast } from "@/components/ui/customToast";

interface PerImageCropState {
  card: { crop: Point; zoom: number; croppedAreaPixels: Area | null };
  detail: { crop: Point; zoom: number; croppedAreaPixels: Area | null };
}

interface ImageCropOverlayProps {
  imageItems: ImageItem[];
  detailUrlMap: Map<string, string | undefined>;
  onComplete: (results: ImageCropResult[]) => void;
  onCancel: () => void;
}

type CropView = "card" | "detail";

function makeDefaultCropState(): PerImageCropState {
  return {
    card: { crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null },
    detail: { crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null },
  };
}

function makeViewKey(itemIndex: number, view: CropView) {
  return `${itemIndex}_${view}`;
}

export default function ImageCropOverlay({
  imageItems,
  detailUrlMap,
  onComplete,
  onCancel,
}: ImageCropOverlayProps) {
  const getImageSrc = useCallback((item: ImageItem): string => {
    if (item.type === "new") return item.objectUrl;
    return item.url;
  }, []);
  const [cropStates, setCropStates] = useState<PerImageCropState[]>(() =>
    imageItems.map(() => makeDefaultCropState())
  );
  const [croppablePos, setCroppablePos] = useState(0);
  const [cropView, setCropView] = useState<CropView>("card");
  const [isGenerating, setIsGenerating] = useState(false);
  const activeInteractionsRef = useRef<Set<string>>(new Set());
  const [dirtyViews, setDirtyViews] = useState<Set<string>>(new Set());
  const markDirty = (itemIndex: number, view: CropView) => {
    const key = makeViewKey(itemIndex, view);
    setDirtyViews((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };
  const currentItemIndex = croppablePos;
  const currentItem = imageItems[currentItemIndex];
  const currentCropState = cropStates[currentItemIndex];

  const updateCropState = (
    itemIndex: number,
    view: CropView,
    patch: Partial<PerImageCropState["card"]>
  ) => {
    setCropStates((prev) => {
      const next = [...prev];
      next[itemIndex] = {
        ...next[itemIndex],
        [view]: { ...next[itemIndex][view], ...patch },
      };
      return next;
    });
  };

  const handleCropChange = (crop: Point) =>
    updateCropState(currentItemIndex, cropView, { crop });

  const handleZoomChange = (zoom: number) => {
    const currentZoom = currentCropState?.[cropView].zoom ?? 1;
    if (Math.abs(currentZoom - zoom) > Number.EPSILON) {
      markDirty(currentItemIndex, cropView);
    }
    updateCropState(currentItemIndex, cropView, { zoom });
  };

  const onCropChange = (crop: Point) => {
    if (
      activeInteractionsRef.current.has(makeViewKey(currentItemIndex, cropView))
    ) {
      markDirty(currentItemIndex, cropView);
    }
    handleCropChange(crop);
  };

  const handleInteractionStart = () => {
    activeInteractionsRef.current.add(makeViewKey(currentItemIndex, cropView));
  };

  const handleInteractionEnd = () => {
    activeInteractionsRef.current.delete(
      makeViewKey(currentItemIndex, cropView)
    );
  };

  const handleCropComplete = useCallback(
    (_: Area, croppedAreaPixels: Area) =>
      updateCropState(currentItemIndex, cropView, { croppedAreaPixels }),
    [currentItemIndex, cropView]
  );

  const goToPrev = () => {
    const newPos = Math.max(0, croppablePos - 1);
    if (newPos === croppablePos) return;
    setCroppablePos(newPos);
    setCropView("card");
  };

  const goToNext = () => {
    const newPos = Math.min(imageItems.length - 1, croppablePos + 1);
    if (newPos === croppablePos) return;
    setCroppablePos(newPos);
    setCropView("card");
  };

  const handleTabClick = (view: CropView) => {
    setCropView(view);
  };

  const handleConfirmAll = async () => {
    setIsGenerating(true);

    const results: ImageCropResult[] = [];
    let corsFailCount = 0;

    for (let i = 0; i < imageItems.length; i++) {
      const item = imageItems[i];
      const state = cropStates[i];

      if (item.type === "existing") {
        const cardSrc = item.url;

        const existingDetailUrl = detailUrlMap.get(item.url) ?? item.url;

        const detailSrc = existingDetailUrl;

        const dirtyCard = dirtyViews.has(makeViewKey(i, "card"));
        const dirtyDetail = dirtyViews.has(makeViewKey(i, "detail"));

        if (!dirtyCard && !dirtyDetail) {
          results.push({
            type: "existing_complete",
            cardUrl: item.url,
            detailUrl: existingDetailUrl,
          });
          continue;
        }

        const [cardBlob, detailBlob] = await Promise.all([
          dirtyCard
            ? getCroppedImageBlob(
                cardSrc,
                state.card.croppedAreaPixels!,
                CARD_CROP_WIDTH,
                CARD_CROP_HEIGHT
              )
            : Promise.resolve(null),
          dirtyDetail
            ? getCroppedImageBlob(
                detailSrc,
                state.detail.croppedAreaPixels!,
                DETAIL_CROP_WIDTH,
                DETAIL_CROP_HEIGHT
              )
            : Promise.resolve(null),
        ]);

        if ((dirtyCard && !cardBlob) || (dirtyDetail && !detailBlob)) {
          results.push({
            type: "existing_complete",
            cardUrl: item.url,
            detailUrl: existingDetailUrl,
          });
          corsFailCount++;
          continue;
        }

        if (cardBlob && detailBlob) {
          results.push({ type: "new", cardBlob, detailBlob });
        } else if (cardBlob) {
          results.push({
            type: "existing_card_recrop",
            cardBlob,
            detailUrl: existingDetailUrl,
          });
        } else {
          results.push({
            type: "existing_recrop",
            cardUrl: item.url,
            detailBlob: detailBlob!,
          });
        }
      } else {
        const src = getImageSrc(item);
        const cardPixels =
          state.card.croppedAreaPixels ??
          (await getDefaultCrop(src, CARD_ASPECT_RATIO));
        const detailPixels =
          state.detail.croppedAreaPixels ??
          (await getDefaultCrop(src, DETAIL_ASPECT_RATIO));

        const [cardBlob, detailBlob] = await Promise.all([
          cardPixels
            ? getCroppedImageBlob(
                src,
                cardPixels,
                CARD_CROP_WIDTH,
                CARD_CROP_HEIGHT
              )
            : null,
          detailPixels
            ? getCroppedImageBlob(
                src,
                detailPixels,
                DETAIL_CROP_WIDTH,
                DETAIL_CROP_HEIGHT
              )
            : null,
        ]);

        if (!cardBlob || !detailBlob) {
          setIsGenerating(false);
          errorToast("Failed to process one or more images. Please try again.");
          return;
        }

        results.push({ type: "new", cardBlob, detailBlob });
      }
    }

    if (corsFailCount > 0) {
      errorToast(
        `${corsFailCount} existing image${corsFailCount > 1 ? "s" : ""} could not be re-cropped — original crop was preserved.`
      );
    }

    setIsGenerating(false);
    onComplete(results);
  };

  const aspectRatio =
    cropView === "card" ? CARD_ASPECT_RATIO : DETAIL_ASPECT_RATIO;
  const cropLabel =
    cropView === "card" ? "Card Thumbnail (16:9)" : "Detail Header (21:9)";

  const imageSrc = (() => {
    if (!currentItem) return "";
    if (currentItem.type === "new") return currentItem.objectUrl;
    if (cropView === "detail")
      return detailUrlMap.get(currentItem.url) ?? currentItem.url;
    return currentItem.url;
  })();

  const currentState =
    cropView === "card" ? currentCropState?.card : currentCropState?.detail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-800/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#050505] border-2 border-neutral-800 dark:border-white w-full max-w-2xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b-2 border-neutral-800 dark:border-white flex-shrink-0">
          <div>
            <h2 className="font-syne font-black uppercase tracking-widest text-neutral-800 dark:text-white text-sm">
              Crop Your Images
            </h2>
            <p className="font-space text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">
              Position each image for best display
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 border-2 border-neutral-800 dark:border-white flex items-center justify-center hover:bg-neutral-800 hover:text-white dark:hover:bg-white dark:hover:text-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/10 dark:border-white/10 flex-shrink-0">
          <button
            onClick={goToPrev}
            disabled={croppablePos === 0}
            className="w-7 h-7 border-2 border-neutral-800 dark:border-white flex items-center justify-center hover:bg-neutral-800 hover:text-white dark:hover:bg-white dark:hover:text-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-space font-bold uppercase tracking-widest text-[10px] text-neutral-800 dark:text-white">
            Image {croppablePos + 1} of {imageItems.length}
          </span>
          <button
            onClick={goToNext}
            disabled={croppablePos === imageItems.length - 1}
            className="w-7 h-7 border-2 border-neutral-800 dark:border-white flex items-center justify-center hover:bg-neutral-800 hover:text-white dark:hover:bg-white dark:hover:text-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex border-b-2 border-neutral-800 dark:border-white flex-shrink-0">
          <button
            onClick={() => handleTabClick("card")}
            className={`flex-1 py-2.5 font-space font-bold uppercase tracking-widest text-[10px] transition-colors border-r-2 border-neutral-800 dark:border-white ${
              cropView === "card"
                ? "bg-neutral-800 text-white dark:bg-white dark:text-neutral-800"
                : "text-neutral-800 dark:text-white hover:bg-neutral-800/5 dark:hover:bg-white/5"
            }`}
          >
            Card (16:9)
          </button>
          <button
            onClick={() => handleTabClick("detail")}
            className={`flex-1 py-2.5 font-space font-bold uppercase tracking-widest text-[10px] transition-colors ${
              cropView === "detail"
                ? "bg-neutral-800 text-white dark:bg-white dark:text-neutral-800"
                : "text-neutral-800 dark:text-white hover:bg-neutral-800/5 dark:hover:bg-white/5"
            }`}
          >
            Detail (21:9)
          </button>
        </div>

        <div
          className="relative flex-1 min-h-0 bg-gray-900"
          style={{ minHeight: "280px" }}
        >
          {imageSrc && currentState && (
            <Cropper
              key={`${currentItemIndex}_${cropView}`}
              image={imageSrc}
              crop={currentState.crop}
              zoom={currentState.zoom}
              aspect={aspectRatio}
              onCropChange={onCropChange}
              onZoomChange={handleZoomChange}
              onCropComplete={handleCropComplete}
              onInteractionStart={handleInteractionStart}
              onInteractionEnd={handleInteractionEnd}
              showGrid={true}
              style={{
                containerStyle: { borderRadius: 0 },
                cropAreaStyle: { border: "2px solid rgba(255,255,255,0.8)" },
              }}
            />
          )}
          <div className="absolute top-2 left-2 z-10 bg-neutral-800/70 text-white font-space font-bold uppercase tracking-widest text-[9px] px-2 py-1">
            {cropLabel}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-neutral-800/10 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-space text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider flex-shrink-0">
              Zoom
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={currentState?.zoom ?? 1}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="flex-1 accent-black dark:accent-white h-1"
            />
          </div>
        </div>

        {imageItems.length > 1 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto flex-shrink-0">
            {imageItems.map((item, i) => {
              const isCurrentImage = i === croppablePos;
              const src = item.type === "new" ? item.objectUrl : item.url;

              return (
                <button
                  key={i}
                  onClick={() => {
                    setCroppablePos(i);
                    setCropView("card");
                  }}
                  className={`flex-shrink-0 relative w-12 h-12 border-2 overflow-hidden transition-all ${
                    isCurrentImage
                      ? "border-red-500"
                      : "border-neutral-800 dark:border-white opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={src}
                    alt={`Image ${i + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 p-4 border-t-2 border-neutral-800 dark:border-white flex-shrink-0">
          <button
            onClick={onCancel}
            disabled={isGenerating}
            className="flex-1 py-3 border-2 border-neutral-800 dark:border-white font-space font-bold uppercase tracking-widest text-[10px] text-neutral-800 dark:text-white hover:bg-neutral-800 hover:text-white dark:hover:bg-white dark:hover:text-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmAll}
            disabled={isGenerating}
            className="flex-1 py-3 bg-neutral-800 text-white dark:bg-white dark:text-neutral-800 font-space font-bold uppercase tracking-widest text-[10px] hover:bg-red-500 dark:hover:bg-red-500 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm & Submit"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
