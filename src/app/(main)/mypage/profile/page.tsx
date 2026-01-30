import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDaycareInfo } from "@/services/mypageService";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const daycare = await getDaycareInfo(user.id);

  if (!daycare) {
    redirect("/mypage");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Link
            href="/mypage"
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="ml-2 text-lg font-semibold text-gray-900">
            내 정보 수정
          </h1>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="px-4 py-6">
        <ProfileForm daycare={daycare} />
      </div>
    </div>
  );
}
