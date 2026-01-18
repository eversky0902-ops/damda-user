import Link from "next/link";
import { Bell, Pin, ChevronRight, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getNotices } from "@/services/contentService";
import { Pagination } from "@/components/products/Pagination";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

interface NoticesPageProps {
  searchParams: Promise<{ page?: string }>;
}

export const metadata = {
  title: "공지사항 | 담다",
  description: "담다의 공지사항을 확인하세요.",
};

export default async function NoticesPage({ searchParams }: NoticesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 10;

  const { data: notices, total } = await getNotices(page, pageSize);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-damda-yellow" />
            공지사항
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {notices.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="space-y-3">
              {notices.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination currentPage={page} totalPages={totalPages} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function NoticeCard({ notice }: { notice: { id: string; title: string; is_pinned: boolean; view_count: number; created_at: string } }) {
  return (
    <Link href={`/notices/${notice.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {notice.is_pinned && (
                  <Badge className="bg-damda-yellow-light text-damda-yellow-dark">
                    <Pin className="w-3 h-3 mr-1" />
                    고정
                  </Badge>
                )}
                <h3 className="font-medium text-gray-900 truncate">{notice.title}</h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>
                  {format(parseISO(notice.created_at), "yyyy.MM.dd", { locale: ko })}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {notice.view_count}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-white rounded-xl">
      <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 공지사항이 없습니다</h3>
    </div>
  );
}
