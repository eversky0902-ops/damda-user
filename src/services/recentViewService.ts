import { createClient } from "@/lib/supabase/client";

// 최근 본 상품 추가 (클라이언트)
export async function addRecentView(productId: string): Promise<boolean> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // upsert: 이미 있으면 viewed_at 업데이트, 없으면 추가
  const { error } = await supabase
    .from("recent_views")
    .upsert(
      {
        daycare_id: user.id,
        product_id: productId,
        viewed_at: new Date().toISOString(),
      },
      {
        onConflict: "daycare_id,product_id",
      }
    );

  if (error) {
    console.error("Error adding recent view:", error);
    return false;
  }

  return true;
}
