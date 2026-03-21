import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/categories";

export async function GET() {
  return NextResponse.json({
    categories: CATEGORIES,
    total: CATEGORIES.length,
    totalSubcategories: CATEGORIES.reduce(
      (acc, c) => acc + c.subcategories.length,
      0
    ),
  });
}
