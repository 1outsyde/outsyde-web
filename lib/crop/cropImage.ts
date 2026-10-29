// Browser helpers for the crop box (photo ratios step 3b): open a picked file as an image and
// save the cropped part as a JPEG. The browser applies the photo's EXIF rotation both when it
// shows the image and when it draws it on a canvas, so what is cropped is what was shown.

import { clampArea, outputSizeFor, type Area, type CropPreset, type Size } from "./cropMath";

/** Opens a picked file as an image. Rejects when the browser can't read it (for example HEIC in Chrome). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

/** The cropped part of the photo as a JPEG File of the preset's size. Transparent parts become white. */
export async function cropToFile(src: string, area: Area, preset: CropPreset, name = "photo.jpg"): Promise<{ file: File } & Size> {
  const img = await loadImage(src);
  const image = { width: img.naturalWidth, height: img.naturalHeight };
  const a = clampArea(area, image);
  const out = outputSizeFor({ width: a.width, height: a.height }, preset.aspect, preset.maxLong);
  const canvas = document.createElement("canvas");
  canvas.width = out.width;
  canvas.height = out.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, a.x, a.y, a.width, a.height, 0, 0, out.width, out.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85),
  );
  return { file: new File([blob], name, { type: "image/jpeg" }), width: out.width, height: out.height };
}
