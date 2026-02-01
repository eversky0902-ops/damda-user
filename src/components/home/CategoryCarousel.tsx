"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { type Category } from "@/services/categoryService";

interface CategoryCarouselProps {
  categories: Category[];
}

export function CategoryCarousel({ categories }: CategoryCarouselProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // 페이지당 6개 (3열 x 2줄)
  const itemsPerPage = 6;
  const totalPages = Math.ceil(categories.length / itemsPerPage);

  // 현재 페이지의 카테고리들
  const currentCategories = categories.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <div className="relative">
      {/* 캐러셀 컨테이너 */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentPage * 100}%)` }}
        >
          {Array.from({ length: totalPages }).map((_, pageIndex) => (
            <div key={pageIndex} className="w-full flex-shrink-0">
              <div className="grid grid-cols-3 gap-2">
                {categories
                  .slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage)
                  .map((category) => (
                    <MobileCategoryItem key={category.id} category={category} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 페이지 인디케이터 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                currentPage === index
                  ? "bg-damda-yellow"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              aria-label={`페이지 ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileCategoryItem({ category }: { category: Category }) {
  return (
    <Link
      href={`/products?category=${category.id}`}
      className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-damda-yellow-light/50 active:bg-damda-yellow-light transition-colors"
    >
      <div className="w-12 h-12 flex items-center justify-center">
        {category.icon_url ? (
          <Image
            src={category.icon_url}
            alt={category.name}
            width={40}
            height={40}
            className="w-10 h-10"
          />
        ) : (
          <Sparkles className="w-8 h-8 text-damda-yellow-dark" />
        )}
      </div>
      <span className="text-xs text-gray-700 font-medium text-center line-clamp-1 w-full">
        {category.name}
      </span>
    </Link>
  );
}
