import type { Metadata } from "next";
import { getAllPortfolioItemsForAdmin } from "@/lib/data/portfolio";
import { PortfolioManager } from "@/components/admin/portfolio-manager";

export const metadata: Metadata = { title: "Portfolio" };

export default async function AdminPortfolioPage() {
  const items = await getAllPortfolioItemsForAdmin();
  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Portfolio</h1>
      <PortfolioManager initialItems={items} />
    </div>
  );
}
