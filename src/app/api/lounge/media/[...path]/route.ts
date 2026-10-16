import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/lounge/api";
import { createServiceRoleClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ path: string[] }> };
const BUCKETS = new Set(["lounge-media", "lounge-files"]);

/** GET /api/lounge/media/<bucket>/<owner-id>/<file> — the only way Lounge
 *  uploads reach a browser. The buckets are private; this streams an object
 *  with the service role after checking that the caller is signed in and
 *  is the file's owner, an approved member, or a site admin. Responses are
 *  cacheable per user only (`private`), never by shared caches, so a
 *  picture cannot be fetched by someone who is not entitled to see it. */
export async function GET(request: Request, { params }: Params) {
  const { path } = await params;
  const [bucket, ...rest] = path ?? [];
  // Next.js already decodes catch-all segments; join them as-is.
  const objectPath = rest.join("/");
  if (!bucket || !BUCKETS.has(bucket) || !objectPath || objectPath.includes("..") || objectPath.startsWith("/")) {
    return jsonError("Not found.", 404);
  }

  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  const isOwner = rest[0] === ctx.user.id;
  if (!isOwner) {
    const [{ data: member }, { data: me }] = await Promise.all([
      ctx.supabase.from("lounge_members").select("status").eq("user_id", ctx.user.id).maybeSingle(),
      ctx.supabase.from("users").select("role").eq("id", ctx.user.id).maybeSingle(),
    ]);
    if (member?.status !== "approved" && me?.role !== "admin") return jsonError("Members only.", 403);
  }

  const service = await createServiceRoleClient();
  const { data, error } = await service.storage.from(bucket).download(objectPath);
  if (error || !data) return jsonError("Not found.", 404);

  const download = new URL(request.url).searchParams.get("download");
  const headers: Record<string, string> = {
    "Content-Type": data.type || "application/octet-stream",
    "Content-Length": String(data.size),
    "Cache-Control": "private, max-age=86400",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": download ? `attachment; filename*=UTF-8''${encodeURIComponent(download.slice(0, 200))}` : "inline",
  };
  return new Response(data.stream(), { headers });
}
