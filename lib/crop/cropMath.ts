// Crop shapes and saved sizes for goutsyde.com uploads (photo ratios step 3b).
// Same shapes and sizes as the app (OutsydeCapture utils/crop/cropMath.ts outputSizeFor).
// Pure functions only, unit tested in tests/crop-math.test.ts.

export type Size = { width: number; height: number };
export type Area = { x: number; y: number; width: number; height: number };

export type CropPreset = {
  /** Width / height of the box. */
  aspect: number;
  /** "round" shows a circle while cropping; the saved file is still a square. */
  shape: "rect" | "round";
  title: string;
  /** Longest side of the saved photo. */
  maxLong: number;
};

/** The shapes decided for Outsyde uploads. */
export const CROP_PRESETS = {
  eventCover: { aspect: 4 / 5, shape: "rect", title: "Crop flyer", maxLong: 1350 },
  cover: { aspect: 16 / 9, shape: "rect", title: "Crop cover photo", maxLong: 1920 },
  logo: { aspect: 1, shape: "round", title: "Crop logo", maxLong: 1080 },
  // Sign up photos were already saved at 512 at most; that size is kept.
  signupLogo: { aspect: 1, shape: "round", title: "Crop logo", maxLong: 512 },
  profile: { aspect: 1, shape: "round", title: "Crop profile photo", maxLong: 512 },
} as const satisfies Record<string, CropPreset>;

export type CropPresetKey = keyof typeof CROP_PRESETS;

/** Smallest whole width:height pair for a shape (4:5 -> [4, 5], 16:9 -> [16, 9]), or null. */
export function ratioPair(aspect: number): [number, number] | null {
  for (let h = 1; h <= 50; h++) {
    const w = Math.round(aspect * h);
    if (w > 0 && Math.abs(w / h - aspect) < 1e-6) return [w, h];
  }
  return null;
}

/**
 * Saved size for a crop: never larger than the cropped pixels (no upscaling), long side at most
 * `maxLong`, exact ratio when the ratio is a simple fraction (4:5 -> 1080x1350, 16:9 -> 1920x1080).
 * Whole pixels, at least 1.
 */
export function outputSizeFor(crop: Size, aspect: number, maxLong: number): Size {
  const k = Math.min(1, maxLong / Math.max(crop.width, crop.height, 1));
  const maxW = crop.width * k;
  const maxH = crop.height * k;
  const pair = ratioPair(aspect);
  if (pair) {
    const unit = Math.max(
      1,
      // Half a pixel of slack so a crop a hair short (2419 for 2419.2) still saves the full size.
      Math.floor(Math.min((maxW + 0.5) / pair[0], (maxH + 0.5) / pair[1])),
    );
    return { width: unit * pair[0], height: unit * pair[1] };
  }
  const height = Math.max(1, Math.floor(Math.min(maxH, maxW / aspect)));
  return { width: Math.max(1, Math.round(height * aspect)), height };
}

/** Keeps a crop area inside the photo, in whole pixels. */
export function clampArea(area: Area, image: Size): Area {
  const x = Math.max(0, Math.min(image.width - 1, Math.round(area.x)));
  const y = Math.max(0, Math.min(image.height - 1, Math.round(area.y)));
  const width = Math.max(1, Math.min(image.width - x, Math.round(area.width)));
  const height = Math.max(1, Math.min(image.height - y, Math.round(area.height)));
  return { x, y, width, height };
}
