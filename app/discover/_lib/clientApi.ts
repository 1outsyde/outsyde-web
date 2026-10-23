/* eslint-disable @typescript-eslint/no-explicit-any -- the brief types body as any; callers narrow with feedLogic mappers */
export type ApiResult = { ok: boolean; status: number; body: any };

async function call(path: string, method: string = "GET", json?: unknown): Promise<ApiResult> {
  try {
    const init: RequestInit = { method, cache: "no-store" };
    if (json !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(json);
    }
    const res = await fetch(path, init);
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}

const qs = (o: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};
const enc = encodeURIComponent;

export const clientApi = {
  feed: (a: { limit: number; scope?: string; offset?: number }) =>
    call(`/api/discover/feed${qs({ limit: a.limit, scope: a.scope, offset: a.offset })}`),
  pulse: (a: { limit: number; cursor?: string }) =>
    call(`/api/discover/pulse${qs({ limit: a.limit, cursor: a.cursor })}`),
  stories: () => call("/api/discover/stories"),
  storyView: (id: string) => call(`/api/discover/stories/${enc(id)}/view`, "POST"),
  like: (id: string, on: boolean) => call(`/api/discover/posts/${enc(id)}/like`, on ? "POST" : "DELETE"),
  save: (id: string, on: boolean) => call(`/api/discover/posts/${enc(id)}/save`, on ? "POST" : "DELETE"),
  comments: (id: string) => call(`/api/discover/posts/${enc(id)}/comments`),
  addComment: (id: string, content: string) => call(`/api/discover/posts/${enc(id)}/comments`, "POST", { content }),
  engagement: (body: unknown) => call("/api/discover/pulse/engagement", "POST", body),
  followCheck: (userId: string) => call(`/api/discover/follow/${enc(userId)}`),
  follow: (userId: string, on: boolean) => call(`/api/discover/follow/${enc(userId)}`, on ? "POST" : "DELETE"),
  events: (query: string) => call(`/api/events${query ? (query.startsWith("?") ? query : `?${query}`) : ""}`),
};
