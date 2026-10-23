import { NextRequest } from "next/server";
import { badRequest, forward, invalidBody, isUuid, readJsonObject } from "../../../events/_lib/bff";

const isMs = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

export async function POST(req: NextRequest) {
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  const { postId, watchTimeMs, videoDurationMs, isRewatch } = body;
  if (typeof postId !== "string" || !isUuid(postId) || !isMs(watchTimeMs) || !isMs(videoDurationMs) || (isRewatch !== undefined && typeof isRewatch !== "boolean")) {
    return badRequest("INVALID_BODY", "postId, watchTimeMs and videoDurationMs are required.");
  }
  const clean: Record<string, unknown> = { postId, watchTimeMs, videoDurationMs };
  if (isRewatch !== undefined) clean.isRewatch = isRewatch;
  return forward(req, "POST", "/api/pulse/engagement", clean);
}
