import type { Metadata } from "next";
import { getAllLibraryItemsForAdmin } from "@/lib/data/library";
import { LibraryManager } from "@/components/admin/library-manager";

export const metadata: Metadata = { title: "Claude Library" };
export const dynamic = "force-dynamic";

export default async function AdminLibraryPage() {
  const items = await getAllLibraryItemsForAdmin();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Claude Library <span className="text-ink-soft">· مكتبة كلود</span></h1>
      <LibraryManager initialItems={items} />
    </div>
  );
}
