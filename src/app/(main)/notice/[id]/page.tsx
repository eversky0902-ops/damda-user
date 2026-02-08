import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";
import { getNoticeById } from "@/services/contentService";

interface NoticeDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: NoticeDetailPageProps) {
  const { id } = await params;
  const notice = await getNoticeById(id);

  if (!notice) {
    return { title: "공지사항을 찾을 수 없습니다 | 담다" };
  }

  return {
    title: `${notice.title} | 담다`,
    description: notice.content?.slice(0, 100) || notice.title,
  };
}

export default async function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const { id } = await params;
  const notice = await getNoticeById(id);

  if (!notice) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="px-4 py-4 border-b border-gray-200">
          <Link
            href="/notice"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
            목록으로
          </Link>
        </div>

        {/* 제목 영역 */}
        <div className="px-4 py-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">{notice.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
            <span>{format(new Date(notice.created_at), "yyyy년 M월 d일", { locale: ko })}</span>
            <span>조회 {notice.view_count}</span>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-4 py-6">
          <div
            className="text-sm text-gray-700 leading-relaxed notice-content"
            dangerouslySetInnerHTML={{ __html: notice.content }}
          />
          <style>{`
            .notice-content img {
              max-width: 100%;
              height: auto;
            }
            .notice-content p {
              margin: 0;
              min-height: 1.4em;
            }
          `}</style>
        </div>

        {/* 하단 목록 버튼 */}
        <div className="px-4 py-6 border-t border-gray-200">
          <Link
            href="/notice"
            className="inline-flex items-center justify-center w-full py-3 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
