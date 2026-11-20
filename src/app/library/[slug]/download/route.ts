import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { getLibraryItemBySlug } from "@/lib/data/library";
import { safeFileName } from "@/lib/library";

export const dynamic = "force-dynamic";

/** GET /library/{slug}/download — counts the download, then sends the
 *  browser to the file. Uploaded files are served by Supabase Storage with
 *  ?download= so they save under a readable name; files shipped with the
 *  site get an attachment header from next.config. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getLibraryItemBySlug(slug);
  if (!item) return NextResponse.redirect(new URL("/library", request.url));

  const { error } = await createPublicClient().rpc("library_record_download", { p_id: item.id });
  if (error) console.error("library download count:", error.message);

  let target: URL;
  if (/^https?:\/\//i.test(item.file_url)) {
    target = new URL(item.file_url);
    if (item.storage_path) target.searchParams.set("download", safeFileName(item.file_name));
  } else {
    target = new URL(item.file_url, request.url);
  }
  return NextResponse.redirect(target, 302);
}
