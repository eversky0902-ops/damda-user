import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { getMainCategories, type Category } from "@/services/categoryService";

export async function CategoryGrid() {
  const categories = await getMainCategories();

  // 데이터가 없으면 기본 카테고리 표시
  const displayCategories = categories.length > 0 ? categories : defaultCategories;

  return (
    <section className="py-10 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-6 gap-4">
          {displayCategories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.id}`}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-damda-yellow-light/50 transition-colors group"
            >
              <div className="w-14 h-14 flex items-center justify-center">
                {category.icon_url ? (
                  <Image
                    src={category.icon_url}
                    alt={category.name}
                    width={48}
                    height={48}
                    className="w-12 h-12"
                  />
                ) : (
                  <Sparkles className="w-10 h-10 text-damda-yellow-dark" />
                )}
              </div>
              <span className="text-sm text-gray-700 font-medium text-center">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// 기본 카테고리 (DB에 데이터가 없을 경우)
const defaultCategories: Category[] = [
  { id: "best", name: "BEST 체험", sort_order: 1, parent_id: null, depth: 1, is_active: true, icon_url: "/icons/categories/best.svg" },
  { id: "seasonal", name: "계절 특화체험", sort_order: 2, parent_id: null, depth: 1, is_active: true, icon_url: "/icons/categories/seasonal.svg" },
  { id: "farm", name: "농장/자연", sort_order: 3, parent_id: null, depth: 1, is_active: true, icon_url: "/icons/categories/farm.svg" },
  { id: "science", name: "과학/박물관", sort_order: 4, parent_id: null, depth: 1, is_active: true, icon_url: "/icons/categories/science.svg" },
  { id: "art", name: "미술/전시회", sort_order: 5, parent_id: null, depth: 1, is_active: true, icon_url: "/icons/categories/art.svg" },
  { id: "cooking", name: "요리/클래스", sort_order: 6, parent_id: null, depth: 1, is_active: true, icon_url: "/icons/categories/cooking.svg" },
  { id: "water", name: "물놀이/수영장", sort_order: 7, parent_id: null, depth: 1, is_active: true, icon_url: "/icons/categories/water.svg" },
  { id: "animal", name: "동물/야외활동", sort_order: 8, parent_id: null, depth: 1, is_active: true, icon_url: "/icons/categories/animal.svg" },
  { id: "musical", name: "뮤지컬/연극", sort_order: 9, parent_id: null, depth: 1, is_active: true, icon_url: "/icons/categories/musical.svg" },
  { id: "music", name: "음악/예술", sort_order: 10, parent_id: null, depth: 1, is_active: true, icon_url: "/icons/categories/music.svg" },
  { id: "amusement", name: "놀이동산/수족관", sort_order: 11, parent_id: null, depth: 1, is_active: true, icon_url: "/icons/categories/amusement.svg" },
  { id: "career", name: "직업/전통/안전", sort_order: 12, parent_id: null, depth: 1, is_active: true, icon_url: "/icons/categories/career.svg" },
];
