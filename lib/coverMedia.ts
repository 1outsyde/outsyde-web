// Cover media helpers (same rules as the app and backend server/coverMedia.ts).
// A video cover is a Mux stream URL (https://stream.mux.com/<id>.m3u8). Right
// after upload it is the Mux upload id until Mux finishes processing.

export const COVER_VIDEO_MAX_SECONDS = 15;
export const COVER_VIDEO_MAX_MB = 200;

export function isPlayableUrl(value: string | null | undefined): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

export function muxThumbnailUrl(src: string | null | undefined): string | null {
  const m = src?.match(/^https:\/\/stream\.mux\.com\/([A-Za-z0-9]+)\.m3u8/);
  return m ? `https://image.mux.com/${m[1]}/thumbnail.jpg` : null;
}

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(v.duration) ? v.duration : null); };
    v.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    v.src = url;
  });
}

/**
 * Checks length and size, uploads the file straight to Mux and returns the
 * Mux upload id to save as the cover (with coverMediaType "video").
 */
export async function uploadCoverVideo(file: File): Promise<string> {
  if (!file.type.startsWith("video/")) throw new Error("Please choose a video file.");
  if (file.size > COVER_VIDEO_MAX_MB * 1024 * 1024) {
    throw new Error(`Video is too large. The limit is ${COVER_VIDEO_MAX_MB}MB.`);
  }
  const duration = await readVideoDuration(file);
  if (duration !== null && duration > COVER_VIDEO_MAX_SECONDS + 0.5) {
    throw new Error(`Video is too long. Cover videos can be up to ${COVER_VIDEO_MAX_SECONDS} seconds.`);
  }

  const urlRes = await fetch("/api/media/video-upload-url", { method: "POST" });
  const data = await urlRes.json().catch(() => ({}));
  if (!urlRes.ok || !data.uploadUrl || !data.uploadId) {
    throw new Error(data.error || "Could not start the video upload.");
  }
  const put = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "video/mp4" },
    body: file,
  });
  if (!put.ok) throw new Error("Video upload failed. Please try again.");
  return data.uploadId as string;
}
