"use client";
// Instagram-style crop box for goutsyde.com uploads (photo ratios step 3b), same shapes as the app.
// Drag to move, pinch or scroll or the slider to zoom; the photo always fills the box. "Use photo"
// saves only the part inside the box as a JPEG (lib/crop/cropImage.ts) and hands it back.

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import type { CropPreset } from "@/lib/crop/cropMath";
import { cropToFile, loadImage } from "@/lib/crop/cropImage";

const MAX_ZOOM = 5;

export type CropResult = { file: File; width: number; height: number };

export default function CropModal({ file, preset, onCancel, onDone }: {
  file: File;
  preset: CropPreset;
  onCancel(): void;
  onDone(result: CropResult): void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Open the picked file; a file the browser can't read (HEIC in Chrome, a broken file) says so.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    let alive = true;
    loadImage(url).then(
      () => { if (alive) setSrc(url); },
      () => { if (alive) setError("This photo couldn't be opened. Try a JPG or PNG."); },
    );
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onCancel]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  async function savePhoto() {
    if (!src || !area || saving) return;
    setSaving(true);
    setError(null);
    try {
      onDone(await cropToFile(src, area, preset));
    } catch {
      setError("This photo couldn't be saved. Try again.");
      setSaving(false);
    }
  }

  const ready = !!src && !!area && !saving;
  return (
    <div role="dialog" aria-modal="true" aria-label={preset.title} data-testid="crop-modal"
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#0B0B0B", color: "#F5F0E6", display: "flex", flexDirection: "column", fontFamily: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        padding: "max(12px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left))" }}>
        <button ref={cancelRef} type="button" onClick={onCancel} data-testid="crop-cancel"
          style={{ background: "none", border: 0, color: "#F5F0E6", font: "inherit", fontSize: 16, minHeight: 44, padding: "0 4px", cursor: "pointer" }}>
          Cancel
        </button>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{preset.title}</span>
        <button type="button" onClick={savePhoto} disabled={!ready} data-testid="crop-done"
          style={{ background: "none", border: 0, color: "#E8B930", font: "inherit", fontSize: 16, fontWeight: 700, minHeight: 44, padding: "0 4px", cursor: ready ? "pointer" : "default", opacity: ready ? 1 : 0.4 }}>
          {saving ? "Saving…" : "Use photo"}
        </button>
      </div>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {src ? (
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={preset.aspect}
            cropShape={preset.shape}
            minZoom={1}
            maxZoom={MAX_ZOOM}
            showGrid={preset.shape === "rect"}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{ containerStyle: { background: "#000" } }}
          />
        ) : !error ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#B8B0A0", fontSize: 14 }}>Opening photo…</div>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        padding: "14px max(16px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 360, fontSize: 13, color: "#B8B0A0" }}>
          Zoom
          <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} disabled={!src}
            onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" data-testid="crop-zoom"
            style={{ flex: 1, accentColor: "#E8B930" }} />
        </label>
        <span role={error ? "alert" : undefined} style={{ fontSize: 14, color: error ? "#FF8A80" : "rgba(245,240,230,0.8)", textAlign: "center" }}>
          {error ?? "Drag to move, pinch or use the slider to zoom"}
        </span>
      </div>
    </div>
  );
}
