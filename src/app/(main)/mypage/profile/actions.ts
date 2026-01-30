"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface UpdateDaycareInput {
  name: string;
  representative: string;
  contact_name: string;
  contact_phone: string;
  tel: string;
  address: string;
  address_detail: string;
  zipcode: string;
  capacity: number | null;
}

export async function updateDaycareInfo(
  daycareId: string,
  input: UpdateDaycareInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== daycareId) {
    return { success: false, error: "권한이 없습니다." };
  }

  const { error } = await supabase
    .from("daycares")
    .update({
      name: input.name,
      representative: input.representative || null,
      contact_name: input.contact_name,
      contact_phone: input.contact_phone,
      tel: input.tel || null,
      address: input.address,
      address_detail: input.address_detail || null,
      zipcode: input.zipcode || null,
      capacity: input.capacity,
    })
    .eq("id", daycareId);

  if (error) {
    console.error("Error updating daycare:", error);
    return { success: false, error: "정보 수정에 실패했습니다." };
  }

  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");

  return { success: true };
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 현재 비밀번호 확인
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { success: false, error: "현재 비밀번호가 일치하지 않습니다." };
  }

  // 새 비밀번호로 변경
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    console.error("Error updating password:", updateError);
    return { success: false, error: "비밀번호 변경에 실패했습니다." };
  }

  return { success: true };
}

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 어린이집 상태를 'deleted'로 변경 (소프트 삭제)
  const { error: daycareError } = await supabase
    .from("daycares")
    .update({ status: "deleted" })
    .eq("id", user.id);

  if (daycareError) {
    console.error("Error deleting daycare:", daycareError);
    return { success: false, error: "회원 탈퇴에 실패했습니다." };
  }

  // 로그아웃 처리
  await supabase.auth.signOut();

  return { success: true };
}
