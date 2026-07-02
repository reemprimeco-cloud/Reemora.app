import type { Metadata } from "next";
import { getCategories } from "@/lib/data/categories";
import { CategoryManager } from "@/components/admin/category-manager";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await getCategories();

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Course Categories</h1>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
