import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../../events/_lib/bff";

export async function POST(req: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  if (!isUuid(storyId)) return notFound();
  return forward(req, "POST", `/api/stories/${storyId}/view`);
}
