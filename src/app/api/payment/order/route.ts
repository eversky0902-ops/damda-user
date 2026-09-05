import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type CheckoutOption = { id?: unknown; quantity?: unknown };
type CheckoutItem = {
  productId?: unknown;
  reservedDate?: unknown;
  reservedTime?: unknown;
  participants?: unknown;
  options?: unknown;
};

function isCheckoutItem(value: unknown): value is CheckoutItem {
  if (!value || typeof value !== "object") return false;
  const item = value as CheckoutItem;
  return (
    typeof item.productId === "string" &&
    typeof item.reservedDate === "string" &&
    typeof item.participants === "number" &&
    Array.isArray(item.options) &&
    item.options.every(
      (option): option is CheckoutOption =>
        Boolean(option) &&
        typeof option === "object" &&
        typeof option.id === "string" &&
        typeof option.quantity === "number"
    )
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = body?.items;
    const reserverInfo = body?.reserverInfo;
    const paymentMethod = body?.paymentMethod;

    if (
      !Array.isArray(items) ||
      !items.every(isCheckoutItem) ||
      !reserverInfo ||
      typeof reserverInfo.name !== "string" ||
      typeof reserverInfo.phone !== "string" ||
      (paymentMethod !== "card" && paymentMethod !== "bank")
    ) {
      return NextResponse.json({ error: "주문 정보가 올바르지 않습니다." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("create_secure_payment_order", {
      p_items: items.map((item) => ({
        productId: item.productId,
        reservedDate: item.reservedDate,
        reservedTime: typeof item.reservedTime === "string" ? item.reservedTime : null,
        participants: item.participants,
        options: (item.options as CheckoutOption[]).map((option) => ({
          id: option.id,
          quantity: option.quantity,
        })),
      })),
      p_reserver_info: {
        name: reserverInfo.name.trim(),
        phone: reserverInfo.phone.trim(),
        email: typeof reserverInfo.email === "string" ? reserverInfo.email.trim() : "",
        daycareName: typeof reserverInfo.daycareName === "string" ? reserverInfo.daycareName.trim() : "",
      },
      p_payment_method: paymentMethod,
    });

    if (error || !data) {
      console.error("Secure payment order creation failed", error?.code, error?.message);
      return NextResponse.json(
        { error: "주문 정보를 생성하지 못했습니다. 일정과 인원을 다시 확인해주세요." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: "주문 정보를 처리하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
