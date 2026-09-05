import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const NICEPAY_API_URL = "https://api.nicepay.co.kr/v1/payments";

export async function POST(request: NextRequest) {
  try {
    const { tid, orderId } = await request.json();

    if (typeof tid !== "string" || typeof orderId !== "string" || !tid || !orderId) {
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

    const { data: order, error: orderError } = await supabase
      .from("payment_orders")
      .select("order_id, amount, status, reservation_ids")
      .eq("order_id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "주문 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    if (order.status === "paid") {
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

    // Basic 인증: clientKey:secretKey를 Base64 인코딩
    const authKey = Buffer.from(`${clientKey}:${secretKey}`).toString("base64");

    // 나이스페이 승인 API 호출
    const response = await fetch(`${NICEPAY_API_URL}/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authKey}`,
      },
      body: JSON.stringify({
        amount: order.amount,
      }),
    });

    const result = await response.json();

    if (
      result.resultCode === "0000" &&
      result.orderId === order.order_id &&
      Number(result.amount) === order.amount
    ) {
      const { data: finalized, error: finalizeError } = await supabase.rpc("finalize_secure_payment_order", {
        p_order_id: order.order_id,
        p_tid: result.tid,
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
      console.error("Payment approval failed", result.resultCode);
      return NextResponse.json({
        success: false,
        error: result.resultMsg || "결제 승인에 실패했습니다.",
        code: result.resultCode,
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
