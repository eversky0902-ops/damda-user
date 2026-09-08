import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const NICEPAY_API_URL = "https://api.nicepay.co.kr/v1/payments";

export async function POST(request: NextRequest) {
  try {
    const { tid, orderId } = await request.json();

    if (
      typeof tid !== "string" ||
      typeof orderId !== "string" ||
      !tid.trim() ||
      !orderId.trim() ||
      tid.length > 100 ||
      orderId.length > 64
    ) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
    }

    // This client only authenticates the requester. Finalisation below uses
    // server-only credentials after NICEPAY's source record is verified.
    const serviceSupabase = createServiceClient();
    const { data: order, error: orderError } = await serviceSupabase
      .from("payment_orders")
      .select("order_id, daycare_id, amount, payment_method, status, pg_tid, reservation_ids, items")
      .eq("order_id", orderId)
      .eq("daycare_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "주문 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    if (order.status === "paid") {
      if (order.pg_tid !== tid) {
        return NextResponse.json({ success: false, error: "주문 결제 정보가 일치하지 않습니다." }, { status: 409 });
      }
      return NextResponse.json({
        success: true,
        data: { orderId: order.order_id, reservationIds: order.reservation_ids, idempotent: true },
      });
    }

    const clientKey = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_KEY;
    const secretKey = process.env.NICEPAY_SECRET_KEY;

    if (!clientKey || !secretKey) {
      console.error("NICEPAY keys are not configured");
      return NextResponse.json(
        { success: false, error: "결제 설정 오류입니다." },
        { status: 500 }
      );
    }

    // NICEPAY 인증결제는 인증 응답을 받은 뒤 서버에서 승인 API를 호출해야
    // 실제로 결제가 완료됩니다. 조회(GET)가 아니라 승인(POST) 결과만을
    // 예약 확정의 근거로 사용합니다.
    const authKey = Buffer.from(`${clientKey}:${secretKey}`).toString("base64");
    const response = await fetch(`${NICEPAY_API_URL}/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authKey}`,
      },
      body: JSON.stringify({ amount: order.amount }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => null);

    if (
      response.ok &&
      result &&
      result.resultCode === "0000" &&
      result.tid === tid &&
      result.orderId === order.order_id &&
      Number(result.amount) === order.amount
    ) {
      const { data: finalized, error: finalizeError } = await serviceSupabase.rpc("finalize_secure_payment_order", {
        p_order_id: order.order_id,
        p_tid: tid,
        p_paid_amount: order.amount,
      });

      if (finalizeError || !finalized) {
        console.error("Secure payment finalization failed", finalizeError?.code, finalizeError?.message);
        return NextResponse.json(
          {
            success: false,
            paymentApproved: true,
            error: "결제는 승인됐지만 예약 확정에 실패했습니다. 고객센터로 문의해주세요.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: finalized,
      });
    } else {
      console.error("Payment verification failed", result?.resultCode, result?.status);
      return NextResponse.json({
        success: false,
        error: result?.resultMsg || "결제 승인 정보를 검증하지 못했습니다.",
        code: result?.resultCode,
      });
    }
  } catch (error) {
    console.error("Payment approval error:", error);
    return NextResponse.json(
      { success: false, error: "결제 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
