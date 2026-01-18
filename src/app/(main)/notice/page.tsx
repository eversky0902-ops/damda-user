import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Megaphone, ChevronRight, Pin } from "lucide-react";
import { getNotices } from "@/services/contentService";

export const metadata = {
  title: "공지사항 | 담다",
  description: "담다의 공지사항을 확인하세요.",
};

export default async function NoticePage() {
  const { data: notices, total } = await getNotices(1, 50);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="px-4 py-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">공지사항</h1>
          <p className="text-sm text-gray-500 mt-1">담다의 새로운 소식을 확인하세요.</p>
        </div>

        {notices.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            {notices.map((notice, index) => (
              <Link
                key={notice.id}
                href={`/notice/${notice.id}`}
                className={`flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors ${
                  index !== notices.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {notice.is_pinned && (
                      <Pin className="w-3.5 h-3.5 text-damda-yellow flex-shrink-0" />
                    )}
                    <span className={`text-sm truncate ${notice.is_pinned ? "font-medium text-gray-900" : "text-gray-700"}`}>
                      {notice.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>
                      {format(new Date(notice.created_at), "yyyy.MM.dd", { locale: ko })}
                    </span>
                    <span>조회 {notice.view_count}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-4 py-16 text-center">
      <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">등록된 공지사항이 없습니다.</p>
    </div>
  );
}
