import { CropArea } from "./types";

export function loadImageForCanvas(
  src: string
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: CropArea,
  outputWidth: number,
  outputHeight: number,
  quality = 0.85
): Promise<Blob | null> {
  const image = await loadImageForCanvas(imageSrc);
  if (!image) return null;

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

export async function getDefaultCrop(
  imageSrc: string,
  aspectRatio: number
): Promise<CropArea | null> {
  const image = await loadImageForCanvas(imageSrc);
  if (!image) return null;

  const { naturalWidth: w, naturalHeight: h } = image;
  const imageAspect = w / h;
  let cropWidth: number, cropHeight: number;

  if (imageAspect > aspectRatio) {
    cropHeight = h;
    cropWidth = h * aspectRatio;
  } else {
    cropWidth = w;
    cropHeight = w / aspectRatio;
  }

  return {
    x: (w - cropWidth) / 2,
    y: (h - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  };
}
