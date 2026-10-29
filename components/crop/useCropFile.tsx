"use client";
// Promise-style crop box (photo ratios step 3b), like the app's useCropPicker:
//   const { crop, cropModal } = useCropFile();
//   const result = await crop(file, "eventCover"); // null when cancelled
// Render {cropModal} once in the page.

import { useCallback, useRef, useState } from "react";
import CropModal, { type CropResult } from "./CropModal";
import { CROP_PRESETS, type CropPresetKey } from "@/lib/crop/cropMath";

export function useCropFile() {
  const [state, setState] = useState<{ file: File; preset: CropPresetKey } | null>(null);
  const resolver = useRef<((r: CropResult | null) => void) | null>(null);

  const finish = useCallback((r: CropResult | null) => {
    const resolve = resolver.current;
    resolver.current = null;
    setState(null);
    resolve?.(r);
  }, []);

  const crop = useCallback((file: File, preset: CropPresetKey): Promise<CropResult | null> => {
    resolver.current?.(null);
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState({ file, preset });
    });
  }, []);

  const onCancel = useCallback(() => finish(null), [finish]);
  const cropModal = state ? (
    <CropModal file={state.file} preset={CROP_PRESETS[state.preset]} onCancel={onCancel} onDone={finish} />
  ) : null;

  return { crop, cropModal, isCropping: !!state };
}
