"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  User,
  Phone,
  MapPin,
  Lock,
  AlertTriangle,
  Loader2,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { type DaycareInfo } from "@/services/mypageService";
import { updateDaycareInfo, updatePassword, deleteAccount } from "./actions";

interface ProfileFormProps {
  daycare: DaycareInfo;
}

export default function ProfileForm({ daycare }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 어린이집 정보 상태
  const [formData, setFormData] = useState({
    name: daycare.name,
    representative: daycare.representative || "",
    contact_name: daycare.contact_name,
    contact_phone: daycare.contact_phone,
    tel: daycare.tel || "",
    address: daycare.address,
    address_detail: daycare.address_detail || "",
    zipcode: daycare.zipcode || "",
    capacity: daycare.capacity?.toString() || "",
  });

  // 비밀번호 변경 상태
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);

  // 회원 탈퇴 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // 변경사항 체크
  const hasChanges =
    formData.name !== daycare.name ||
    formData.representative !== (daycare.representative || "") ||
    formData.contact_name !== daycare.contact_name ||
    formData.contact_phone !== daycare.contact_phone ||
    formData.tel !== (daycare.tel || "") ||
    formData.address !== daycare.address ||
    formData.address_detail !== (daycare.address_detail || "") ||
    formData.zipcode !== (daycare.zipcode || "") ||
    formData.capacity !== (daycare.capacity?.toString() || "");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges) {
      toast.info("변경된 내용이 없습니다.");
      return;
    }

    startTransition(async () => {
      const result = await updateDaycareInfo(daycare.id, {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
      });

      if (result.success) {
        toast.success("정보가 수정되었습니다.");
        router.refresh();
      } else {
        toast.error(result.error || "정보 수정에 실패했습니다.");
      }
    });
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setIsPasswordChanging(true);

    const result = await updatePassword(
      passwordData.currentPassword,
      passwordData.newPassword
    );

    setIsPasswordChanging(false);

    if (result.success) {
      toast.success("비밀번호가 변경되었습니다.");
      setPasswordDialogOpen(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } else {
      toast.error(result.error || "비밀번호 변경에 실패했습니다.");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "회원탈퇴") {
      toast.error("'회원탈퇴'를 정확히 입력해주세요.");
      return;
    }

    setIsDeleting(true);

    const result = await deleteAccount();

    setIsDeleting(false);

    if (result.success) {
      toast.success("회원 탈퇴가 완료되었습니다.");
      router.push("/");
    } else {
      toast.error(result.error || "회원 탈퇴에 실패했습니다.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 어린이집 정보 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-damda-yellow" />
            어린이집 정보
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                어린이집명 <span className="text-red-500">*</span>
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="어린이집명을 입력하세요"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                대표자
              </label>
              <Input
                name="representative"
                value={formData.representative}
                onChange={handleInputChange}
                placeholder="대표자명을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                대표번호
              </label>
              <Input
                name="tel"
                value={formData.tel}
                onChange={handleInputChange}
                placeholder="대표번호를 입력하세요 (예: 02-1234-5678)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                정원
              </label>
              <Input
                name="capacity"
                type="number"
                value={formData.capacity}
                onChange={handleInputChange}
                placeholder="정원 수를 입력하세요"
                min={0}
              />
            </div>
          </div>
        </section>

        {/* 담당자 정보 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-damda-yellow" />
            담당자 정보
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                담당자명 <span className="text-red-500">*</span>
              </label>
              <Input
                name="contact_name"
                value={formData.contact_name}
                onChange={handleInputChange}
                placeholder="담당자명을 입력하세요"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                담당자 연락처 <span className="text-red-500">*</span>
              </label>
              <Input
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleInputChange}
                placeholder="담당자 연락처를 입력하세요"
                required
              />
            </div>
          </div>
        </section>

        {/* 주소 정보 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-damda-yellow" />
            주소
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                우편번호
              </label>
              <Input
                name="zipcode"
                value={formData.zipcode}
                onChange={handleInputChange}
                placeholder="우편번호"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                주소 <span className="text-red-500">*</span>
              </label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="주소를 입력하세요"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                상세주소
              </label>
              <Input
                name="address_detail"
                value={formData.address_detail}
                onChange={handleInputChange}
                placeholder="상세주소를 입력하세요"
              />
            </div>
          </div>
        </section>

        {/* 읽기 전용 정보 */}
        <section className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-500 mb-4">
            수정 불가 정보
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-500">이메일</span>
              <span className="text-gray-900">{daycare.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-500">인가번호</span>
              <span className="text-gray-900">{daycare.license_number}</span>
            </div>
            {daycare.business_number && (
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">사업자번호</span>
                <span className="text-gray-900">{daycare.business_number}</span>
              </div>
            )}
          </div>
        </section>

        {/* 저장 버튼 */}
        <Button
          type="submit"
          disabled={isPending || !hasChanges}
          className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-white font-medium rounded-xl"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              변경사항 저장
            </>
          )}
        </Button>
      </form>

      {/* 비밀번호 변경 섹션 */}
      <section className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-900">비밀번호 변경</span>
          </div>
          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                변경하기
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>비밀번호 변경</DialogTitle>
                <DialogDescription>
                  현재 비밀번호를 입력하고 새 비밀번호를 설정하세요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    현재 비밀번호
                  </label>
                  <Input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    placeholder="현재 비밀번호"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    새 비밀번호
                  </label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="새 비밀번호 (8자 이상)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    새 비밀번호 확인
                  </label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="새 비밀번호 확인"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">취소</Button>
                </DialogClose>
                <Button
                  onClick={handlePasswordChange}
                  disabled={isPasswordChanging}
                  className="bg-damda-yellow hover:bg-damda-yellow-dark text-white"
                >
                  {isPasswordChanging ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      변경 중...
                    </>
                  ) : (
                    "비밀번호 변경"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* 회원 탈퇴 섹션 */}
      <section className="mt-6 mb-8 pt-6 border-t border-gray-100">
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <button className="text-sm text-gray-400 hover:text-red-500 transition-colors">
              회원 탈퇴
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                회원 탈퇴
              </DialogTitle>
              <DialogDescription className="text-left pt-2">
                회원 탈퇴 시 모든 예약 내역, 리뷰, 찜 목록이 삭제되며 복구할 수
                없습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-700 mb-3">
                탈퇴를 원하시면 아래에 <strong>&apos;회원탈퇴&apos;</strong>를 입력해주세요.
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="회원탈퇴"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== "회원탈퇴"}
                variant="destructive"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    탈퇴 처리 중...
                  </>
                ) : (
                  "회원 탈퇴"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
